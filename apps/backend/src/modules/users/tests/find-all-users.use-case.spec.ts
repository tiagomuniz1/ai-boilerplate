import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { FindAllUsersUseCase } from '../use-cases/find-all-users.use-case'
import { IUsersRepository } from '../repositories/users.repository.interface'
import { CacheService } from '../../../cache/cache.service'
import { PaginationDto } from '../../../common/dto/pagination.dto'
import { User } from '../entities/user.entity'

const mockUsersRepository: jest.Mocked<IUsersRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
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

function makeUser(): User {
  return {
    id: faker.string.uuid(),
    fullName: faker.person.fullName(),
    email: faker.internet.email(),
    password: 'hash',
    role: UserRole.USER,
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }
}

describe('FindAllUsersUseCase', () => {
  let useCase: FindAllUsersUseCase
  const pagination: PaginationDto = Object.assign(new PaginationDto(), { page: 1, limit: 20 })

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindAllUsersUseCase({} as DataSource, mockUsersRepository, mockCacheService)
  })

  it('returns cached result when cache hit', async () => {
    const cached = { data: [], total: 0, page: 1, limit: 20 }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(pagination)

    expect(result).toBe(cached)
    expect(mockUsersRepository.findAll).not.toHaveBeenCalled()
  })

  it('fetches from repository on cache miss and caches the result', async () => {
    const users = [makeUser(), makeUser()]
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findAll.mockResolvedValue([users, 2])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(pagination)

    expect(mockUsersRepository.findAll).toHaveBeenCalledWith(1, 20)
    expect(result.total).toBe(2)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.data).toHaveLength(2)
    expect(mockCacheService.set).toHaveBeenCalledWith('users:list:1:20', result, 60)
  })

  it('response data does not include password or version', async () => {
    const user = makeUser()
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findAll.mockResolvedValue([[user], 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(pagination)

    expect(result.data[0]).not.toHaveProperty('password')
    expect(result.data[0]).not.toHaveProperty('version')
  })

  it('returns correct pagination metadata', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findAll.mockResolvedValue([[], 42])
    mockCacheService.set.mockResolvedValue(undefined)

    const pag: PaginationDto = Object.assign(new PaginationDto(), { page: 3, limit: 10 })
    const result = await useCase.execute(pag)

    expect(result.total).toBe(42)
    expect(result.page).toBe(3)
    expect(result.limit).toBe(10)
  })

  it('does not throw when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('Redis down'))
    mockUsersRepository.findAll.mockResolvedValue([[], 0])
    mockCacheService.set.mockResolvedValue(undefined)

    await expect(useCase.execute(pagination)).resolves.toBeDefined()
    expect(mockUsersRepository.findAll).toHaveBeenCalled()
  })

  it('does not throw when cache write fails', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findAll.mockResolvedValue([[], 0])
    mockCacheService.set.mockRejectedValue(new Error('Redis down'))

    await expect(useCase.execute(pagination)).resolves.toBeDefined()
  })
})
