import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { DeleteUserUseCase } from '../use-cases/delete-user.use-case'
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

function makeUser(): User {
  return {
    id: faker.string.uuid(),
    fullName: faker.person.fullName(),
    email: faker.internet.email(),
    password: 'hash',
    role: UserRole.USER,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }
}

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteUserUseCase({} as DataSource, mockUsersRepository, mockCacheService)
    mockUsersRepository.delete.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
  })

  it('deletes the user and returns void', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)

    await expect(useCase.execute(user.id)).resolves.toBeUndefined()
    expect(mockUsersRepository.delete).toHaveBeenCalledWith(user.id)
  })

  it('throws NotFoundException when user does not exist', async () => {
    mockUsersRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute('nonexistent')).rejects.toThrow(NotFoundException)
    expect(mockUsersRepository.delete).not.toHaveBeenCalled()
  })

  it('invalidates individual and list cache after deletion', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)

    await useCase.execute(user.id)

    expect(mockCacheService.del).toHaveBeenCalledWith(`user:${user.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('users:list*')
  })

  it('does not throw when cache invalidation fails', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockCacheService.del.mockRejectedValue(new Error('Redis down'))

    await expect(useCase.execute(user.id)).resolves.toBeUndefined()
  })
})
