import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource, QueryRunner } from 'typeorm'
import { ExamRequestStatus, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IExamRequestsRepository } from '../repositories/exam-requests.repository.interface'
import { IExamResultsRepository } from '../repositories/exam-results.repository.interface'
import { FindExamRequestByIdUseCase } from '../use-cases/find-exam-request-by-id.use-case'
import { AddExamResultUseCase } from '../use-cases/add-exam-result.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const doctorId = 'doctor-uuid'
const examRequestId = 'exam-uuid'
const appointmentId = 'appt-uuid'

const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.DOCTOR, clinicId }

const makeExamRequest = (overrides = {}) => ({
  id: examRequestId,
  clinicId,
  appointmentId,
  patientId: 'patient-uuid',
  doctorId,
  issuedAt: new Date(),
  status: ExamRequestStatus.REQUESTED,
  snapshot: {
    issuedAt: new Date().toISOString(),
    clinic: { name: 'Clinic', address: null, logoUrl: null },
    doctor: { name: 'Doctor', crmNumber: '12345/SP', specialtyName: null },
    patient: { name: 'Patient', documentNumber: '12345678900' },
    items: [],
    notes: null,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const makeFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File =>
  ({
    fieldname: 'files',
    originalname: 'hemograma.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('fake-pdf-bytes'),
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

const mockExamRequestsRepository: jest.Mocked<IExamRequestsRepository> = {
  findByAppointment: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  delete: jest.fn(),
}

const mockExamResultsRepository: jest.Mocked<IExamResultsRepository> = {
  findByExamRequestIds: jest.fn(),
  findById: jest.fn(),
  countActiveByExamRequest: jest.fn(),
  create: jest.fn(),
  deleteByExamRequestId: jest.fn(),
  delete: jest.fn(),
}

const mockDoctorsRepository: jest.Mocked<IDoctorsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByCrmNumber: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockStorageAdapter = {
  upload: jest.fn(),
  download: jest.fn(),
} as unknown as jest.Mocked<IStorageAdapter>

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const mockFindExamRequestByIdUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<FindExamRequestByIdUseCase>

describe('AddExamResultUseCase', () => {
  let useCase: AddExamResultUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new AddExamResultUseCase(
      mockDataSource,
      mockExamRequestsRepository,
      mockExamResultsRepository,
      mockDoctorsRepository,
      mockStorageAdapter,
      mockCacheService,
      mockFindExamRequestByIdUseCase,
    )
    mockExamRequestsRepository.findById.mockResolvedValue(makeExamRequest() as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: doctorId } as any)
    mockStorageAdapter.upload.mockResolvedValue('exam-results/clinic-uuid/exam-uuid/file.pdf')
    mockExamResultsRepository.create.mockResolvedValue({} as any)
    mockExamRequestsRepository.updateStatus.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockFindExamRequestByIdUseCase.execute.mockResolvedValue({ id: examRequestId, status: ExamRequestStatus.COMPLETED } as any)
  })

  it('uploads a single valid file and moves status to completed', async () => {
    const result = await useCase.execute(examRequestId, [makeFile()], doctorUser)

    expect(mockStorageAdapter.upload).toHaveBeenCalledTimes(1)
    expect(mockExamResultsRepository.create).toHaveBeenCalledTimes(1)
    expect(mockExamRequestsRepository.updateStatus).toHaveBeenCalledWith(
      examRequestId,
      ExamRequestStatus.COMPLETED,
      mockQueryRunner,
    )
    expect(result.status).toBe(ExamRequestStatus.COMPLETED)
  })

  it('uploads multiple files (pdf + image) in the same call, persisting all with a single status update', async () => {
    const files = [makeFile({ mimetype: 'application/pdf' }), makeFile({ mimetype: 'image/jpeg', originalname: 'raio-x.jpg' })]

    await useCase.execute(examRequestId, files, doctorUser)

    expect(mockStorageAdapter.upload).toHaveBeenCalledTimes(2)
    expect(mockExamResultsRepository.create).toHaveBeenCalledTimes(2)
    expect(mockExamRequestsRepository.updateStatus).toHaveBeenCalledTimes(1)
  })

  it('does not call updateStatus again when the exam request is already completed', async () => {
    mockExamRequestsRepository.findById.mockResolvedValue(makeExamRequest({ status: ExamRequestStatus.COMPLETED }) as any)

    await useCase.execute(examRequestId, [makeFile()], doctorUser)

    expect(mockExamRequestsRepository.updateStatus).not.toHaveBeenCalled()
  })

  it('builds storage path using clinicId, examRequestId and file extension', async () => {
    await useCase.execute(examRequestId, [makeFile({ mimetype: 'image/png' })], doctorUser)

    const [, path, mimeType, isPublic] = mockStorageAdapter.upload.mock.calls[0]
    expect(path).toMatch(new RegExp(`^exam-results/${clinicId}/${examRequestId}/.+\\.png$`))
    expect(mimeType).toBe('image/png')
    expect(isPublic).toBe(false)
  })

  it('uploads exam result files privately, never with public-read visibility', async () => {
    await useCase.execute(examRequestId, [makeFile()], doctorUser)

    expect(mockStorageAdapter.upload).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.any(String),
      expect.any(String),
      false,
    )
  })

  it('throws UnprocessableEntityException for invalid mimetype and persists nothing', async () => {
    await expect(
      useCase.execute(examRequestId, [makeFile({ mimetype: 'text/plain' })], doctorUser),
    ).rejects.toThrow(UnprocessableEntityException)

    expect(mockStorageAdapter.upload).not.toHaveBeenCalled()
    expect(mockExamResultsRepository.create).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when a file exceeds 10MB and persists nothing', async () => {
    await expect(
      useCase.execute(examRequestId, [makeFile({ size: 11 * 1024 * 1024 })], doctorUser),
    ).rejects.toThrow(UnprocessableEntityException)

    expect(mockStorageAdapter.upload).not.toHaveBeenCalled()
  })

  it('validates all files before uploading any — one invalid file blocks the whole batch', async () => {
    const files = [makeFile(), makeFile({ mimetype: 'text/plain' })]

    await expect(useCase.execute(examRequestId, files, doctorUser)).rejects.toThrow(UnprocessableEntityException)

    expect(mockStorageAdapter.upload).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when no files are provided', async () => {
    await expect(useCase.execute(examRequestId, [], doctorUser)).rejects.toThrow(UnprocessableEntityException)
    expect(mockStorageAdapter.upload).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when DOCTOR is not the owner of the exam request', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)

    await expect(useCase.execute(examRequestId, [makeFile()], doctorUser)).rejects.toThrow(ForbiddenException)
    expect(mockStorageAdapter.upload).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when exam request does not exist', async () => {
    mockExamRequestsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(examRequestId, [makeFile()], doctorUser)).rejects.toThrow(NotFoundException)
  })

  it('invalidates the appointment cache after a successful upload', async () => {
    await useCase.execute(examRequestId, [makeFile()], doctorUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`exam-requests:appointment:${appointmentId}`)
  })

  it('does not throw when cache invalidation fails', async () => {
    mockCacheService.del.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute(examRequestId, [makeFile()], doctorUser)).resolves.toBeDefined()
  })

  it('returns the response built by FindExamRequestByIdUseCase', async () => {
    const result = await useCase.execute(examRequestId, [makeFile()], doctorUser)

    expect(mockFindExamRequestByIdUseCase.execute).toHaveBeenCalledWith(examRequestId, doctorUser)
    expect(result.id).toBe(examRequestId)
  })
})
