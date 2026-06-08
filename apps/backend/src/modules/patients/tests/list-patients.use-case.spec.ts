import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { PatientGender, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IPatientsRepository } from '../repositories/patients.repository.interface'
import { ListPatientsQueryDto } from '../dto/list-patients-query.dto'
import { ListPatientsUseCase } from '../use-cases/list-patients.use-case'

const mockPatientsRepository: jest.Mocked<IPatientsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByDocumentNumber: jest.fn(),
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

const makeUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  fullName: faker.person.fullName(),
  email: faker.internet.email(),
  password: 'hashed',
  role: UserRole.PATIENT,
  isActive: false,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const makePatient = (overrides = {}) => {
  const user = makeUser()
  return {
    id: faker.string.uuid(),
    user,
    userId: user.id,
    documentNumber: '12345678901',
    phoneNumber: '(11) 99999-9999',
    birthDate: '1990-05-15',
    gender: PatientGender.MALE,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

const CLINIC_ID = 'fixed-clinic-uuid'
const adminCurrentUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

const makeQuery = (overrides: Partial<ListPatientsQueryDto> = {}): ListPatientsQueryDto => ({
  page: 1,
  limit: 20,
  ...overrides,
})

describe('ListPatientsUseCase', () => {
  let useCase: ListPatientsUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ListPatientsUseCase(
      {} as DataSource,
      mockPatientsRepository,
      mockCacheService,
    )
  })

  it('returns cached response on cache hit', async () => {
    const cached = { data: [], total: 0, page: 1, limit: 20 }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(makeQuery(), adminCurrentUser)

    expect(result).toBe(cached)
    expect(mockPatientsRepository.findAll).not.toHaveBeenCalled()
  })

  it('fetches from repository on cache miss and saves to cache', async () => {
    const patients = [makePatient()]
    mockCacheService.get.mockResolvedValue(null)
    mockPatientsRepository.findAll.mockResolvedValue([patients as any, 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(makeQuery(), adminCurrentUser)

    expect(mockPatientsRepository.findAll).toHaveBeenCalledWith(1, 20, CLINIC_ID, undefined)
    expect(mockCacheService.set).toHaveBeenCalledWith(
      `patients:list:${CLINIC_ID}:1:20:all`,
      expect.objectContaining({ total: 1, page: 1, limit: 20 }),
      60,
    )
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).not.toHaveProperty('version')
  })

  it('passes search to repository and uses correct cache key', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockPatientsRepository.findAll.mockResolvedValue([[], 0])
    mockCacheService.set.mockResolvedValue(undefined)

    await useCase.execute(makeQuery({ search: 'João' }), adminCurrentUser)

    expect(mockPatientsRepository.findAll).toHaveBeenCalledWith(1, 20, CLINIC_ID, 'João')
    expect(mockCacheService.set).toHaveBeenCalledWith(
      `patients:list:${CLINIC_ID}:1:20:João`,
      expect.anything(),
      60,
    )
  })

  it('continues without cache when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockPatientsRepository.findAll.mockResolvedValue([[], 0])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(makeQuery(), adminCurrentUser)

    expect(result.total).toBe(0)
  })

  it('returns result even when cache write fails', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockPatientsRepository.findAll.mockResolvedValue([[], 0])
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(makeQuery(), adminCurrentUser)

    expect(result.total).toBe(0)
  })

  it('uses page and limit from query', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockPatientsRepository.findAll.mockResolvedValue([[], 0])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(makeQuery({ page: 2, limit: 10 }), adminCurrentUser)

    expect(mockPatientsRepository.findAll).toHaveBeenCalledWith(2, 10, CLINIC_ID, undefined)
    expect(result.page).toBe(2)
    expect(result.limit).toBe(10)
  })
})
