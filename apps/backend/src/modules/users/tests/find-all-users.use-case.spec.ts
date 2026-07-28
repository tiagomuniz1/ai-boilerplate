import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CouncilType, UserRole } from '@app/shared'
import { FindAllUsersUseCase } from '../use-cases/find-all-users.use-case'
import { IUsersRepository } from '../repositories/users.repository.interface'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ListUsersQueryDto } from '../dto/list-users-query.dto'
import { User } from '../entities/user.entity'

const mockUsersRepository: jest.Mocked<IUsersRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updatePassword: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setIfNotExists: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

function makeQueryBuilder(rawResult: unknown[] = []) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawResult),
  }
}

function makeMockDataSource(
  doctorRows: Array<{ user_id: string }> = [],
  patientRows: Array<{ user_id: string }> = [],
  councilTypeRows: Array<{ user_id: string; council_type: CouncilType }> = [],
): DataSource {
  const mock = {
    createQueryBuilder: jest.fn()
      .mockReturnValueOnce(makeQueryBuilder(doctorRows))
      .mockReturnValueOnce(makeQueryBuilder(patientRows))
      .mockReturnValueOnce(makeQueryBuilder(councilTypeRows)),
    createQueryRunner: jest.fn(),
  }
  return mock as unknown as DataSource
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    fullName: faker.person.fullName(),
    email: faker.internet.email(),
    password: 'hash',
    role: UserRole.USER,
    isActive: true,
    clinicId: faker.string.uuid(),
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as User
}

const CLINIC_ID = 'fixed-clinic-uuid'
const adminCurrentUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

describe('FindAllUsersUseCase', () => {
  let useCase: FindAllUsersUseCase
  const pagination: ListUsersQueryDto = Object.assign(new ListUsersQueryDto(), { page: 1, limit: 20 })

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindAllUsersUseCase(makeMockDataSource(), mockUsersRepository, mockCacheService)
  })

  it('returns cached result when cache hit', async () => {
    const cached = { data: [], total: 0, page: 1, limit: 20 }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(pagination, adminCurrentUser)

    expect(result).toBe(cached)
    expect(mockUsersRepository.findAll).not.toHaveBeenCalled()
  })

  it('fetches from repository on cache miss and caches the result', async () => {
    const users = [makeUser(), makeUser()]
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findAll.mockResolvedValue([users, 2])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(pagination, adminCurrentUser)

    expect(mockUsersRepository.findAll).toHaveBeenCalledWith(1, 20, CLINIC_ID, undefined)
    expect(result.total).toBe(2)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.data).toHaveLength(2)
    expect(mockCacheService.set).toHaveBeenCalledWith(`users:list:${CLINIC_ID}:1:20:all`, result, 60)
  })

  it('response data does not include password or version', async () => {
    const user = makeUser()
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findAll.mockResolvedValue([[user], 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(pagination, adminCurrentUser)

    expect(result.data[0]).not.toHaveProperty('password')
    expect(result.data[0]).not.toHaveProperty('version')
  })

  it('response includes isProfessional false and isPatient false when user has no profiles', async () => {
    const user = makeUser()
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findAll.mockResolvedValue([[user], 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(pagination, adminCurrentUser)

    expect(result.data[0].isProfessional).toBe(false)
    expect(result.data[0].isPatient).toBe(false)
  })

  it('response includes councilType null when user has no professional profile', async () => {
    const user = makeUser()
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findAll.mockResolvedValue([[user], 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(pagination, adminCurrentUser)

    expect(result.data[0].councilType).toBeNull()
  })

  it('response includes the primary councilType when user has a professional profile', async () => {
    const user = makeUser()
    useCase = new FindAllUsersUseCase(
      makeMockDataSource(
        [{ user_id: user.id }],
        [],
        [{ user_id: user.id, council_type: CouncilType.CRN }],
      ),
      mockUsersRepository,
      mockCacheService,
    )
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findAll.mockResolvedValue([[user], 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(pagination, adminCurrentUser)

    expect(result.data[0].isProfessional).toBe(true)
    expect(result.data[0].councilType).toBe(CouncilType.CRN)
  })

  it('response includes isProfessional true when user has a linked doctor profile', async () => {
    const user = makeUser()
    useCase = new FindAllUsersUseCase(
      makeMockDataSource([{ user_id: user.id }], []),
      mockUsersRepository,
      mockCacheService,
    )
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findAll.mockResolvedValue([[user], 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(pagination, adminCurrentUser)

    expect(result.data[0].isProfessional).toBe(true)
    expect(result.data[0].isPatient).toBe(false)
  })

  it('response includes isPatient true when user has a linked patient profile', async () => {
    const user = makeUser()
    useCase = new FindAllUsersUseCase(
      makeMockDataSource([], [{ user_id: user.id }]),
      mockUsersRepository,
      mockCacheService,
    )
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findAll.mockResolvedValue([[user], 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(pagination, adminCurrentUser)

    expect(result.data[0].isProfessional).toBe(false)
    expect(result.data[0].isPatient).toBe(true)
  })

  it('response includes both isProfessional and isPatient true when user has both profiles', async () => {
    const user = makeUser()
    useCase = new FindAllUsersUseCase(
      makeMockDataSource([{ user_id: user.id }], [{ user_id: user.id }]),
      mockUsersRepository,
      mockCacheService,
    )
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findAll.mockResolvedValue([[user], 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(pagination, adminCurrentUser)

    expect(result.data[0].isProfessional).toBe(true)
    expect(result.data[0].isPatient).toBe(true)
  })

  it('returns correct pagination metadata', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findAll.mockResolvedValue([[], 42])
    mockCacheService.set.mockResolvedValue(undefined)

    const pag: ListUsersQueryDto = Object.assign(new ListUsersQueryDto(), { page: 3, limit: 10 })
    const result = await useCase.execute(pag, adminCurrentUser)

    expect(result.total).toBe(42)
    expect(result.page).toBe(3)
    expect(result.limit).toBe(10)
  })

  it('passes search param to repository and uses scoped cache key', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findAll.mockResolvedValue([[], 0])
    mockCacheService.set.mockResolvedValue(undefined)

    const searchQuery: ListUsersQueryDto = Object.assign(new ListUsersQueryDto(), { page: 1, limit: 20, search: 'alice' })
    await useCase.execute(searchQuery, adminCurrentUser)

    expect(mockUsersRepository.findAll).toHaveBeenCalledWith(1, 20, CLINIC_ID, 'alice')
    expect(mockCacheService.set).toHaveBeenCalledWith(`users:list:${CLINIC_ID}:1:20:alice`, expect.any(Object), 60)
  })

  it('does not throw when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('Redis down'))
    mockUsersRepository.findAll.mockResolvedValue([[], 0])
    mockCacheService.set.mockResolvedValue(undefined)

    await expect(useCase.execute(pagination, adminCurrentUser)).resolves.toBeDefined()
    expect(mockUsersRepository.findAll).toHaveBeenCalled()
  })

  it('does not throw when cache write fails', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findAll.mockResolvedValue([[], 0])
    mockCacheService.set.mockRejectedValue(new Error('Redis down'))

    await expect(useCase.execute(pagination, adminCurrentUser)).resolves.toBeDefined()
  })
})
