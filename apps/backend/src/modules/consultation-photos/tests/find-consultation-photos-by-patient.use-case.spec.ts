import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IConsultationPhotosRepository } from '../repositories/consultation-photos.repository.interface'
import { ListConsultationPhotosByPatientQueryDto } from '../dto/list-consultation-photos-by-patient-query.dto'
import { FindConsultationPhotosByPatientUseCase } from '../use-cases/find-consultation-photos-by-patient.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const patientId = 'patient-uuid'
const professionalId = 'professional-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const professionalUser: ICurrentUser = { id: 'professional-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makeQuery = (overrides = {}): ListConsultationPhotosByPatientQueryDto =>
  Object.assign(new ListConsultationPhotosByPatientQueryDto(), { page: 1, limit: 20, ...overrides })

const makePhoto = (id: string, overrides = {}) => ({
  id,
  appointmentId: 'appointment-uuid',
  fileName: 'evolucao.jpg',
  mimeType: 'image/jpeg',
  fileSizeBytes: 1000,
  createdAt: new Date(),
  professionalName: 'Ana Nutri',
  appointmentDate: new Date('2026-01-05'),
  ...overrides,
})

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

describe('FindConsultationPhotosByPatientUseCase', () => {
  let useCase: FindConsultationPhotosByPatientUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindConsultationPhotosByPatientUseCase(
      {} as DataSource,
      mockConsultationPhotosRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
    mockConsultationPhotosRepository.findByPatient.mockResolvedValue([[makePhoto('photo-1') as any], 1])
  })

  it('returns paginated photos for ADMIN without any professional filter', async () => {
    const result = await useCase.execute(patientId, makeQuery(), adminUser)

    expect(result.data).toHaveLength(1)
    expect(result.data[0].professionalName).toBe('Ana Nutri')
    expect(result.total).toBe(1)
    expect(mockConsultationPhotosRepository.findByPatient).toHaveBeenCalledWith(
      clinicId,
      patientId,
      1,
      20,
      undefined,
    )
    expect(mockProfessionalsRepository.findByUserId).not.toHaveBeenCalled()
  })

  it('forces the filter to the logged-in professional for PROFESSIONAL — critical isolation rule', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)

    await useCase.execute(patientId, makeQuery(), professionalUser)

    expect(mockConsultationPhotosRepository.findByPatient).toHaveBeenCalledWith(
      clinicId,
      patientId,
      1,
      20,
      professionalId,
    )
  })

  it('returns cached result when available', async () => {
    const cached = { data: [], total: 0, page: 1, limit: 20 }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(patientId, makeQuery(), adminUser)

    expect(result).toBe(cached)
    expect(mockConsultationPhotosRepository.findByPatient).not.toHaveBeenCalled()
  })

  it('writes result to cache with a key scoped by patient, page, limit and professional filter', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)

    await useCase.execute(patientId, makeQuery(), professionalUser)

    expect(mockCacheService.set).toHaveBeenCalledWith(
      `consultation-photos:patient:${patientId}:1:20:${professionalId}`,
      expect.any(Object),
      60,
    )
  })

  it('uses "all" in the cache key when there is no professional filter (ADMIN)', async () => {
    await useCase.execute(patientId, makeQuery(), adminUser)

    expect(mockCacheService.set).toHaveBeenCalledWith(
      `consultation-photos:patient:${patientId}:1:20:all`,
      expect.any(Object),
      60,
    )
  })

  it('does not throw when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('redis down'))
    await expect(useCase.execute(patientId, makeQuery(), adminUser)).resolves.toBeDefined()
  })

  it('does not throw when cache write fails', async () => {
    mockCacheService.set.mockRejectedValue(new Error('redis down'))
    await expect(useCase.execute(patientId, makeQuery(), adminUser)).resolves.toBeDefined()
  })
})
