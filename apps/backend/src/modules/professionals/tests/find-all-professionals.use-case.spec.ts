import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CouncilType, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../repositories/professionals.repository.interface'
import { FindAllProfessionalsUseCase } from '../use-cases/find-all-professionals.use-case'
import { ListProfessionalsQueryDto } from '../dto/list-professionals-query.dto'

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
  bio: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
})

const makeQuery = (overrides: Partial<ListProfessionalsQueryDto> = {}): ListProfessionalsQueryDto =>
  Object.assign(new ListProfessionalsQueryDto(), { page: 1, limit: 20, ...overrides })

const CLINIC_ID = 'fixed-clinic-uuid'
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

describe('FindAllProfessionalsUseCase', () => {
  let useCase: FindAllProfessionalsUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindAllProfessionalsUseCase(
      {} as DataSource,
      mockProfessionalsRepository,
      mockCacheService,
    )
  })

  it('returns paginated response from repository on cache miss', async () => {
    const professional = makeProfessional()
    mockCacheService.get.mockResolvedValue(null)
    mockProfessionalsRepository.findAll.mockResolvedValue([[professional as any], 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(makeQuery(), adminUser)

    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.data[0].id).toBe(professional.id)
    expect(result.data[0].user.fullName).toBe(professional.user.fullName)
  })

  it('returns cached result without calling repository on cache hit', async () => {
    const cached = { data: [], total: 0, page: 1, limit: 20 }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(makeQuery(), adminUser)

    expect(result).toBe(cached)
    expect(mockProfessionalsRepository.findAll).not.toHaveBeenCalled()
  })

  it('calls repository with search param when provided', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockProfessionalsRepository.findAll.mockResolvedValue([[], 0])
    mockCacheService.set.mockResolvedValue(undefined)

    await useCase.execute(makeQuery({ search: 'Cardio' }), adminUser)

    expect(mockProfessionalsRepository.findAll).toHaveBeenCalledWith(1, 20, CLINIC_ID, 'Cardio')
  })

  it('uses all-key when search is absent', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockProfessionalsRepository.findAll.mockResolvedValue([[], 0])
    mockCacheService.set.mockResolvedValue(undefined)

    await useCase.execute(makeQuery(), adminUser)

    expect(mockCacheService.get).toHaveBeenCalledWith(`professionals:list:${CLINIC_ID}:1:20:all`)
  })

  it('continues on cache read failure', async () => {
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockProfessionalsRepository.findAll.mockResolvedValue([[], 0])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(makeQuery(), adminUser)

    expect(result.data).toHaveLength(0)
  })

  it('continues when cache write fails', async () => {
    const professional = makeProfessional()
    mockCacheService.get.mockResolvedValue(null)
    mockProfessionalsRepository.findAll.mockResolvedValue([[professional as any], 1])
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(makeQuery(), adminUser)

    expect(result.total).toBe(1)
  })

  it('response data does not contain version or deletedAt', async () => {
    const professional = makeProfessional()
    mockCacheService.get.mockResolvedValue(null)
    mockProfessionalsRepository.findAll.mockResolvedValue([[professional as any], 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(makeQuery(), adminUser)

    expect(result.data[0]).not.toHaveProperty('version')
    expect(result.data[0]).not.toHaveProperty('deletedAt')
  })

  it('returns only own profile when DOCTOR role', async () => {
    const professional = makeProfessional()
    const professionalUser: ICurrentUser = { id: professional.user.id, role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
    mockProfessionalsRepository.findByUserId.mockResolvedValue(professional as any)

    const result = await useCase.execute(makeQuery(), professionalUser)

    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.data[0].id).toBe(professional.id)
    expect(mockProfessionalsRepository.findAll).not.toHaveBeenCalled()
    expect(mockCacheService.get).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when DOCTOR has no professional profile', async () => {
    const professionalUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(makeQuery(), professionalUser)).rejects.toThrow(NotFoundException)
  })

  it('returns empty specialties array when professional has no specialties', async () => {
    const professional = { ...makeProfessional(), professionalSpecialties: null }
    mockCacheService.get.mockResolvedValue(null)
    mockProfessionalsRepository.findAll.mockResolvedValue([[professional as any], 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(makeQuery(), adminUser)

    expect(result.data[0].specialties).toEqual([])
  })
})
