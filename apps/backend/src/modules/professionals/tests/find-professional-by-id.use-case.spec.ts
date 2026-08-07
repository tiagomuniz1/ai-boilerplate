import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CouncilType, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../repositories/professionals.repository.interface'
import { FindProfessionalByIdUseCase } from '../use-cases/find-professional-by-id.use-case'

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

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setIfNotExists: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const makeProfessional = () => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  user: { id: faker.string.uuid(), fullName: faker.person.fullName(), email: faker.internet.email(), isActive: true } as any,
  registrations: [{ id: faker.string.uuid(), councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
  professionalSpecialties: [
    { id: faker.string.uuid(), specialtyId: 'spec-1', specialty: { id: 'spec-1', name: 'Cardiologia' }, registryNumber: null },
  ],
  bio: 'Especialista em cardio',
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
})

const CLINIC_ID = 'fixed-clinic-uuid'
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

describe('FindProfessionalByIdUseCase', () => {
  let useCase: FindProfessionalByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindProfessionalByIdUseCase(
      {} as DataSource,
      mockProfessionalsRepository,
      mockCacheService,
    )
  })

  it('returns professional from repository on cache miss', async () => {
    const professional = makeProfessional()
    mockCacheService.get.mockResolvedValue(null)
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(professional.id, adminUser)

    expect(result.id).toBe(professional.id)
    expect(result.user.fullName).toBe(professional.user.fullName)
    expect(result.bio).toBe(professional.bio)
  })

  it('returns cached result without calling repository on cache hit', async () => {
    const professional = makeProfessional()
    const cached = { id: professional.id, registrations: [] }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(professional.id, adminUser)

    expect(result).toBe(cached)
    expect(mockProfessionalsRepository.findById).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when professional does not exist', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockProfessionalsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid(), adminUser)).rejects.toThrow(NotFoundException)
  })

  it('saves result to cache with TTL 300', async () => {
    const professional = makeProfessional()
    mockCacheService.get.mockResolvedValue(null)
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockCacheService.set.mockResolvedValue(undefined)

    await useCase.execute(professional.id, adminUser)

    expect(mockCacheService.set).toHaveBeenCalledWith(
      `professional:${CLINIC_ID}:${professional.id}`,
      expect.any(Object),
      300,
    )
  })

  it('continues when cache read fails', async () => {
    const professional = makeProfessional()
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(professional.id, adminUser)

    expect(result.id).toBe(professional.id)
  })

  it('continues when cache write fails', async () => {
    const professional = makeProfessional()
    mockCacheService.get.mockResolvedValue(null)
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(professional.id, adminUser)

    expect(result.id).toBe(professional.id)
  })

  it('response does not contain version or deletedAt', async () => {
    const professional = makeProfessional()
    mockCacheService.get.mockResolvedValue(null)
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(professional.id, adminUser)

    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('allows DOCTOR to view their own profile', async () => {
    const professional = makeProfessional()
    const professionalUser: ICurrentUser = { id: professional.user.id, role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
    mockProfessionalsRepository.findByUserId.mockResolvedValue(professional as any)
    mockCacheService.get.mockResolvedValue(null)
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(professional.id, professionalUser)

    expect(result.id).toBe(professional.id)
  })

  it('throws ForbiddenException when DOCTOR tries to view another professional profile', async () => {
    const professionalUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
    const professional = makeProfessional()
    const ownProfessional = makeProfessional()
    mockProfessionalsRepository.findByUserId.mockResolvedValue(ownProfessional as any)

    await expect(useCase.execute(professional.id, professionalUser)).rejects.toThrow(ForbiddenException)
    expect(mockProfessionalsRepository.findById).not.toHaveBeenCalled()
  })

  it('returns empty specialties array when professional has no specialties', async () => {
    const professional = { ...makeProfessional(), professionalSpecialties: null }
    const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }
    mockCacheService.get.mockResolvedValue(null)
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(professional.id, adminUser)

    expect(result.specialties).toEqual([])
  })
})
