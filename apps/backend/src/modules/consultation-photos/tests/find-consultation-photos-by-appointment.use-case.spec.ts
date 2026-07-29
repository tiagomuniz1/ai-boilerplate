import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IConsultationPhotosRepository } from '../repositories/consultation-photos.repository.interface'
import { FindConsultationPhotosByAppointmentUseCase } from '../use-cases/find-consultation-photos-by-appointment.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const professionalId = 'professional-uuid'
const appointmentId = 'appointment-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const professionalUser: ICurrentUser = { id: 'professional-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makePhoto = () => ({
  id: 'photo-uuid',
  clinicId,
  appointmentId,
  patientId: 'patient-uuid',
  professionalId,
  filePath: 'consultation-photos/clinic-uuid/appointment-uuid/photo-uuid.jpg',
  fileName: 'evolucao.jpg',
  mimeType: 'image/jpeg',
  fileSizeBytes: 1000,
  uploadedByUserId: professionalId,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
})

const mockConsultationPhotosRepository: jest.Mocked<IConsultationPhotosRepository> = {
  findByAppointment: jest.fn(),
  findByPatient: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
}

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByProfessionalAndDate: jest.fn(),
  findActiveBySlot: jest.fn(),
  hasFutureByScheduleId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

const mockProfessionalsRepository: jest.Mocked<IProfessionalsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByRegistration: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

describe('FindConsultationPhotosByAppointmentUseCase', () => {
  let useCase: FindConsultationPhotosByAppointmentUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindConsultationPhotosByAppointmentUseCase(
      {} as DataSource,
      mockConsultationPhotosRepository,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )
    mockConsultationPhotosRepository.findByAppointment.mockResolvedValue([makePhoto() as any])
    mockAppointmentsRepository.findById.mockResolvedValue({ id: appointmentId, professionalId } as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
  })

  it('returns photos for ADMIN without RBAC check', async () => {
    const result = await useCase.execute(appointmentId, adminUser)

    expect(result).toHaveLength(1)
    expect(result[0].appointmentId).toBe(appointmentId)
    expect(mockAppointmentsRepository.findById).not.toHaveBeenCalled()
    expect(mockProfessionalsRepository.findByUserId).not.toHaveBeenCalled()
  })

  it('returns photos for PROFESSIONAL on own appointment', async () => {
    const result = await useCase.execute(appointmentId, professionalUser)

    expect(result).toHaveLength(1)
    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(professionalUser.id, clinicId)
  })

  it('returns cached result on cache hit', async () => {
    const cached = [{ id: 'cached-photo' }]
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(appointmentId, adminUser)

    expect(result).toBe(cached)
    expect(mockConsultationPhotosRepository.findByAppointment).not.toHaveBeenCalled()
  })

  it('caches result on cache miss', async () => {
    await useCase.execute(appointmentId, adminUser)

    expect(mockCacheService.set).toHaveBeenCalledWith(
      `consultation-photos:appointment:${appointmentId}`,
      expect.any(Array),
      60,
    )
  })

  it('throws NotFoundException when PROFESSIONAL accesses non-existent appointment', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(appointmentId, professionalUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when PROFESSIONAL accesses another professional appointment', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: 'other-professional' } as any)

    await expect(useCase.execute(appointmentId, professionalUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when PROFESSIONAL has no professional profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(appointmentId, professionalUser)).rejects.toThrow(ForbiddenException)
  })

  it('does not throw when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute(appointmentId, adminUser)).resolves.toBeDefined()
  })

  it('does not throw when cache write fails', async () => {
    mockCacheService.set.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute(appointmentId, adminUser)).resolves.toBeDefined()
  })
})
