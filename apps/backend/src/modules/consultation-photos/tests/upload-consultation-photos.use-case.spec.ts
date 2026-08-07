import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource, QueryRunner } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IConsultationPhotosRepository } from '../repositories/consultation-photos.repository.interface'
import { UploadConsultationPhotosUseCase } from '../use-cases/upload-consultation-photos.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const professionalId = 'professional-uuid'
const appointmentId = 'appointment-uuid'
const patientId = 'patient-uuid'

const professionalUser: ICurrentUser = { id: 'professional-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makeAppointment = (overrides = {}) => ({
  id: appointmentId,
  clinicId,
  professionalId,
  patientId,
  ...overrides,
})

const makeFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File =>
  ({
    fieldname: 'files',
    originalname: 'evolucao.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake-image-bytes'),
    size: 1024,
    ...overrides,
  }) as Express.Multer.File

const mockQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: {},
} as unknown as QueryRunner

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
} as unknown as DataSource

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByProfessionalAndDate: jest.fn(),
  findActiveBySlot: jest.fn(),
  hasFutureByScheduleId: jest.fn(),
  hasFutureByProfessionalId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

const mockConsultationPhotosRepository: jest.Mocked<IConsultationPhotosRepository> = {
  findByAppointment: jest.fn(),
  findByPatient: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
}

const mockProfessionalsRepository: jest.Mocked<IProfessionalsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByRegistration: jest.fn(),
  countByClinic: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockStorageAdapter = {
  upload: jest.fn(),
  download: jest.fn(),
  remove: jest.fn(),
} as unknown as jest.Mocked<IStorageAdapter>

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

describe('UploadConsultationPhotosUseCase', () => {
  let useCase: UploadConsultationPhotosUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UploadConsultationPhotosUseCase(
      mockDataSource,
      mockAppointmentsRepository,
      mockConsultationPhotosRepository,
      mockProfessionalsRepository,
      mockStorageAdapter,
      mockCacheService,
    )
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment() as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)
    mockStorageAdapter.upload.mockResolvedValue('consultation-photos/clinic-uuid/appointment-uuid/photo.jpg')
    mockConsultationPhotosRepository.create.mockImplementation(async (data) => ({ ...data } as any))
    mockCacheService.del.mockResolvedValue(undefined)
  })

  it('uploads a single valid file', async () => {
    const result = await useCase.execute(appointmentId, [makeFile()], professionalUser)

    expect(mockStorageAdapter.upload).toHaveBeenCalledTimes(1)
    expect(mockConsultationPhotosRepository.create).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(1)
    expect(result[0].appointmentId).toBe(appointmentId)
  })

  it('uploads multiple files in the same call, persisting all in one transaction', async () => {
    const files = [makeFile({ mimetype: 'image/jpeg' }), makeFile({ mimetype: 'image/png', originalname: 'evolucao2.png' })]

    const result = await useCase.execute(appointmentId, files, professionalUser)

    expect(mockStorageAdapter.upload).toHaveBeenCalledTimes(2)
    expect(mockConsultationPhotosRepository.create).toHaveBeenCalledTimes(2)
    expect(result).toHaveLength(2)
  })

  it('derives patientId and professionalId from the appointment, not the client', async () => {
    await useCase.execute(appointmentId, [makeFile()], professionalUser)

    expect(mockConsultationPhotosRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ patientId, professionalId }),
      mockQueryRunner,
    )
  })

  it('builds storage path using clinicId, appointmentId and file extension', async () => {
    await useCase.execute(appointmentId, [makeFile({ mimetype: 'image/png' })], professionalUser)

    const [, path, mimeType] = mockStorageAdapter.upload.mock.calls[0]
    expect(path).toMatch(new RegExp(`^consultation-photos/${clinicId}/${appointmentId}/.+\\.png$`))
    expect(mimeType).toBe('image/png')
  })

  it('throws UnprocessableEntityException for invalid mimetype (e.g. pdf) and persists nothing', async () => {
    await expect(
      useCase.execute(appointmentId, [makeFile({ mimetype: 'application/pdf' })], professionalUser),
    ).rejects.toThrow(UnprocessableEntityException)

    expect(mockStorageAdapter.upload).not.toHaveBeenCalled()
    expect(mockConsultationPhotosRepository.create).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when a file exceeds 8MB and persists nothing', async () => {
    await expect(
      useCase.execute(appointmentId, [makeFile({ size: 9 * 1024 * 1024 })], professionalUser),
    ).rejects.toThrow(UnprocessableEntityException)

    expect(mockStorageAdapter.upload).not.toHaveBeenCalled()
  })

  it('validates all files before uploading any — one invalid file blocks the whole batch', async () => {
    const files = [makeFile(), makeFile({ mimetype: 'application/pdf' })]

    await expect(useCase.execute(appointmentId, files, professionalUser)).rejects.toThrow(UnprocessableEntityException)

    expect(mockStorageAdapter.upload).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when no files are provided', async () => {
    await expect(useCase.execute(appointmentId, [], professionalUser)).rejects.toThrow(UnprocessableEntityException)
    expect(mockStorageAdapter.upload).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when PROFESSIONAL is not the owner of the appointment', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: 'other-professional' } as any)

    await expect(useCase.execute(appointmentId, [makeFile()], professionalUser)).rejects.toThrow(ForbiddenException)
    expect(mockStorageAdapter.upload).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when appointment does not exist', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(appointmentId, [makeFile()], professionalUser)).rejects.toThrow(NotFoundException)
  })

  it('invalidates the appointment cache after a successful upload', async () => {
    await useCase.execute(appointmentId, [makeFile()], professionalUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`consultation-photos:appointment:${appointmentId}`)
  })

  it('does not throw when cache invalidation fails', async () => {
    mockCacheService.del.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute(appointmentId, [makeFile()], professionalUser)).resolves.toBeDefined()
  })
})
