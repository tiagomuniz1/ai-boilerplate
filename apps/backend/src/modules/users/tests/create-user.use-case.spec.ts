import { ConflictException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import { UserRole } from '@app/shared'
import { CreateUserUseCase } from '../use-cases/create-user.use-case'
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

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateUserUseCase({} as DataSource, mockUsersRepository, mockCacheService)
  })

  it('creates user and returns UserResponseDto without password', async () => {
    const dto = {
      fullName: faker.person.fullName(),
      email: faker.internet.email(),
      password: faker.internet.password({ length: 10 }),
      role: UserRole.USER,
    }
    const now = new Date()
    const createdUser: User = {
      id: faker.string.uuid(),
      fullName: dto.fullName,
      email: dto.email,
      password: 'hashed',
      role: UserRole.USER,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockResolvedValue(createdUser)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto)

    expect(result.id).toBe(createdUser.id)
    expect(result.email).toBe(dto.email)
    expect(result.role).toBe(UserRole.USER)
    expect(result).not.toHaveProperty('password')
    expect(result).not.toHaveProperty('version')
  })

  it('stores hashed password, not plaintext', async () => {
    const dto = {
      fullName: 'Alice',
      email: 'alice@example.com',
      password: 'PlainText123',
      role: UserRole.USER,
    }
    const createdUser: User = { ...dto, id: 'u1', password: 'hash', version: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null }

    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockResolvedValue(createdUser)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(dto)

    const calledWith = mockUsersRepository.create.mock.calls[0][0]
    expect(calledWith.password).not.toBe('PlainText123')
    expect(await bcrypt.compare('PlainText123', calledWith.password)).toBe(true)
  })

  it('throws ConflictException when email is already in use', async () => {
    mockUsersRepository.findByEmail.mockResolvedValue({ id: 'existing' } as User)

    await expect(
      useCase.execute({ fullName: 'Bob', email: 'taken@example.com', password: 'Password123', role: UserRole.USER }),
    ).rejects.toThrow(ConflictException)

    expect(mockUsersRepository.create).not.toHaveBeenCalled()
  })

  it('defaults role to USER when not provided (DTO default)', async () => {
    const dto = { fullName: 'Carol', email: 'carol@example.com', password: 'Password123', role: UserRole.USER }
    const createdUser: User = { ...dto, id: 'u2', password: 'hash', version: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null }

    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockResolvedValue(createdUser)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto)

    expect(result.role).toBe(UserRole.USER)
  })

  it('invalidates list cache after creation', async () => {
    const dto = { fullName: 'Dave', email: 'd@e.com', password: 'Password123', role: UserRole.USER }
    const user: User = { ...dto, id: 'u3', password: 'hash', version: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null }

    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockResolvedValue(user)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(dto)

    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('users:list*')
  })

  it('does not throw when cache invalidation fails', async () => {
    const dto = { fullName: 'Eve', email: 'e@f.com', password: 'Password123', role: UserRole.USER }
    const user: User = { ...dto, id: 'u4', password: 'hash', version: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null }

    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockResolvedValue(user)
    mockCacheService.delByPattern.mockRejectedValue(new Error('Redis down'))

    await expect(useCase.execute(dto)).resolves.toBeDefined()
  })
})
