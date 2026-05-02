import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { FindUserByIdUseCase } from '../use-cases/find-user-by-id.use-case'
import { IUsersRepository } from '../repositories/users.repository.interface'
import { CacheService } from '../../../cache/cache.service'
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

function makeUser(id = faker.string.uuid()): User {
  return {
    id,
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

describe('FindUserByIdUseCase', () => {
  let useCase: FindUserByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindUserByIdUseCase({} as DataSource, mockUsersRepository, mockCacheService)
  })

  it('returns cached result when cache hit', async () => {
    const id = faker.string.uuid()
    const cached = { id, fullName: 'Alice', email: 'a@b.com', role: UserRole.USER, createdAt: new Date(), updatedAt: new Date() }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(id)

    expect(result).toBe(cached)
    expect(mockUsersRepository.findById).not.toHaveBeenCalled()
  })

  it('fetches from repository on cache miss and caches the result', async () => {
    const user = makeUser()
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findById.mockResolvedValue(user)
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(user.id)

    expect(mockUsersRepository.findById).toHaveBeenCalledWith(user.id)
    expect(result.id).toBe(user.id)
    expect(mockCacheService.set).toHaveBeenCalledWith(`user:${user.id}`, result, 300)
  })

  it('throws NotFoundException when user does not exist', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute('nonexistent-id')).rejects.toThrow(NotFoundException)
  })

  it('response does not include password or version', async () => {
    const user = makeUser()
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findById.mockResolvedValue(user)
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(user.id)

    expect(result).not.toHaveProperty('password')
    expect(result).not.toHaveProperty('version')
  })

  it('does not throw when cache read fails', async () => {
    const user = makeUser()
    mockCacheService.get.mockRejectedValue(new Error('Redis down'))
    mockUsersRepository.findById.mockResolvedValue(user)
    mockCacheService.set.mockResolvedValue(undefined)

    await expect(useCase.execute(user.id)).resolves.toBeDefined()
    expect(mockUsersRepository.findById).toHaveBeenCalled()
  })

  it('does not throw when cache write fails', async () => {
    const user = makeUser()
    mockCacheService.get.mockResolvedValue(null)
    mockUsersRepository.findById.mockResolvedValue(user)
    mockCacheService.set.mockRejectedValue(new Error('Redis down'))

    await expect(useCase.execute(user.id)).resolves.toBeDefined()
  })
})
