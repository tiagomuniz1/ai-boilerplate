import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../repositories/doctors.repository.interface'
import { FindDoctorByIdUseCase } from '../use-cases/find-doctor-by-id.use-case'

const mockDoctorsRepository: jest.Mocked<IDoctorsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByCrmNumber: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setIfNotExists: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const makeDoctor = () => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  user: { id: faker.string.uuid(), fullName: faker.person.fullName(), email: faker.internet.email() } as any,
  crmNumber: '12345/SP',
  specialties: [{ id: faker.string.uuid(), name: 'Cardiologia' }],
  bio: 'Especialista em cardio',
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
})

const CLINIC_ID = 'fixed-clinic-uuid'
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

describe('FindDoctorByIdUseCase', () => {
  let useCase: FindDoctorByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindDoctorByIdUseCase(
      {} as DataSource,
      mockDoctorsRepository,
      mockCacheService,
    )
  })

  it('returns doctor from repository on cache miss', async () => {
    const doctor = makeDoctor()
    mockCacheService.get.mockResolvedValue(null)
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(doctor.id, adminUser)

    expect(result.id).toBe(doctor.id)
    expect(result.user.fullName).toBe(doctor.user.fullName)
    expect(result.bio).toBe(doctor.bio)
  })

  it('returns cached result without calling repository on cache hit', async () => {
    const doctor = makeDoctor()
    const cached = { id: doctor.id, crmNumber: '12345/SP' }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(doctor.id, adminUser)

    expect(result).toBe(cached)
    expect(mockDoctorsRepository.findById).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when doctor does not exist', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockDoctorsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid(), adminUser)).rejects.toThrow(NotFoundException)
  })

  it('saves result to cache with TTL 300', async () => {
    const doctor = makeDoctor()
    mockCacheService.get.mockResolvedValue(null)
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockCacheService.set.mockResolvedValue(undefined)

    await useCase.execute(doctor.id, adminUser)

    expect(mockCacheService.set).toHaveBeenCalledWith(
      `doctor:${CLINIC_ID}:${doctor.id}`,
      expect.any(Object),
      300,
    )
  })

  it('continues when cache read fails', async () => {
    const doctor = makeDoctor()
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(doctor.id, adminUser)

    expect(result.id).toBe(doctor.id)
  })

  it('continues when cache write fails', async () => {
    const doctor = makeDoctor()
    mockCacheService.get.mockResolvedValue(null)
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(doctor.id, adminUser)

    expect(result.id).toBe(doctor.id)
  })

  it('response does not contain version or deletedAt', async () => {
    const doctor = makeDoctor()
    mockCacheService.get.mockResolvedValue(null)
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(doctor.id, adminUser)

    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('allows DOCTOR to view their own profile', async () => {
    const doctor = makeDoctor()
    const doctorUser: ICurrentUser = { id: doctor.user.id, role: UserRole.DOCTOR, clinicId: CLINIC_ID }
    mockDoctorsRepository.findByUserId.mockResolvedValue(doctor as any)
    mockCacheService.get.mockResolvedValue(null)
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(doctor.id, doctorUser)

    expect(result.id).toBe(doctor.id)
  })

  it('throws ForbiddenException when DOCTOR tries to view another doctor profile', async () => {
    const doctorUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.DOCTOR, clinicId: CLINIC_ID }
    const doctor = makeDoctor()
    const ownDoctor = makeDoctor()
    mockDoctorsRepository.findByUserId.mockResolvedValue(ownDoctor as any)

    await expect(useCase.execute(doctor.id, doctorUser)).rejects.toThrow(ForbiddenException)
    expect(mockDoctorsRepository.findById).not.toHaveBeenCalled()
  })

  it('returns empty specialties array when doctor has no specialties', async () => {
    const doctor = { ...makeDoctor(), specialties: null }
    const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }
    mockCacheService.get.mockResolvedValue(null)
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(doctor.id, adminUser)

    expect(result.specialties).toEqual([])
  })
})
