import { ConflictException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource, QueryFailedError } from 'typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import { UserRole } from '@app/shared'
import { DB_UNIQUE_CONSTRAINTS } from '../../../common/utils/db-constraint.utils'
import { CreateUserUseCase } from '../use-cases/create-user.use-case'
import { IUsersRepository } from '../repositories/users.repository.interface'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { User } from '../entities/user.entity'

function makeUniqueViolation(constraint: string): QueryFailedError {
  const error = new QueryFailedError('INSERT', [], new Error())
  ;(error as any).code = '23505'
  ;(error as any).constraint = constraint
  return error
}

function makeForeignKeyViolation(): QueryFailedError {
  const error = new QueryFailedError('INSERT', [], new Error())
  ;(error as any).code = '23503'
  return error
}

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

const CLINIC_ID = 'fixed-clinic-uuid'
const adminCurrentUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

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
    const createdUser = {
      id: faker.string.uuid(),
      fullName: dto.fullName,
      email: dto.email,
      password: 'hashed',
      role: UserRole.USER,
      isActive: true,
      clinicId: CLINIC_ID,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    } as unknown as User

    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockResolvedValue(createdUser)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto, adminCurrentUser)

    expect(result.id).toBe(createdUser.id)
    expect(result.email).toBe(dto.email)
    expect(result.role).toBe(UserRole.USER)
    expect(result.isActive).toBe(true)
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
    const createdUser = { ...dto, id: 'u1', password: 'hash', isActive: true, clinicId: CLINIC_ID, version: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null } as unknown as User

    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockResolvedValue(createdUser)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(dto, adminCurrentUser)

    const calledWith = mockUsersRepository.create.mock.calls[0][0]
    expect(calledWith.password).not.toBe('PlainText123')
    expect(await bcrypt.compare('PlainText123', calledWith.password)).toBe(true)
  })

  it('throws ConflictException when email is already in use', async () => {
    mockUsersRepository.findByEmail.mockResolvedValue({ id: 'existing' } as User)

    await expect(
      useCase.execute({ fullName: 'Bob', email: 'taken@example.com', password: 'Password123', role: UserRole.USER }, adminCurrentUser),
    ).rejects.toThrow(ConflictException)

    expect(mockUsersRepository.create).not.toHaveBeenCalled()
  })

  it('defaults role to USER when not provided (DTO default)', async () => {
    const dto = { fullName: 'Carol', email: 'carol@example.com', password: 'Password123', role: UserRole.USER }
    const createdUser = { ...dto, id: 'u2', password: 'hash', isActive: true, clinicId: CLINIC_ID, version: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null } as unknown as User

    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockResolvedValue(createdUser)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto, adminCurrentUser)

    expect(result.role).toBe(UserRole.USER)
  })

  it('invalidates list cache after creation using clinicId-scoped key', async () => {
    const dto = { fullName: 'Dave', email: 'd@e.com', password: 'Password123', role: UserRole.USER }
    const user = { ...dto, id: 'u3', password: 'hash', isActive: true, clinicId: CLINIC_ID, version: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null } as unknown as User

    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockResolvedValue(user)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(dto, adminCurrentUser)

    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`users:list:${CLINIC_ID}*`)
  })

  it('throws ConflictException when DB email unique constraint fires (race condition)', async () => {
    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockRejectedValue(makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.USERS_EMAIL))

    await expect(
      useCase.execute({ fullName: 'Alice', email: 'race@example.com', password: 'Password123', role: UserRole.USER }, adminCurrentUser),
    ).rejects.toThrow(ConflictException)
  })

  it('rethrows non-unique-constraint errors from repository create', async () => {
    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockRejectedValue(new Error('Database connection lost'))

    await expect(
      useCase.execute({ fullName: 'Alice', email: 'a@b.com', password: 'Password123', role: UserRole.USER }, adminCurrentUser),
    ).rejects.toThrow('Database connection lost')
  })

  it('throws UnprocessableEntityException when FK violation fires (clinic not found)', async () => {
    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockRejectedValue(makeForeignKeyViolation())

    await expect(
      useCase.execute({ fullName: 'Alice', email: 'a@b.com', password: 'Password123', role: UserRole.USER }, adminCurrentUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  describe('when caller is PLATFORM_ADMIN', () => {
    const platformAdminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.PLATFORM_ADMIN, clinicId: null }
    const TARGET_CLINIC_ID = faker.string.uuid()

    it('creates user using clinicId from DTO', async () => {
      const dto = {
        fullName: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password({ length: 10 }),
        role: UserRole.ADMIN,
        clinicId: TARGET_CLINIC_ID,
      }
      const createdUser = {
        id: faker.string.uuid(),
        fullName: dto.fullName,
        email: dto.email,
        password: 'hashed',
        role: UserRole.ADMIN,
        isActive: true,
        clinicId: TARGET_CLINIC_ID,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as unknown as User

      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockUsersRepository.create.mockResolvedValue(createdUser)
      mockCacheService.delByPattern.mockResolvedValue(undefined)

      const result = await useCase.execute(dto, platformAdminUser)

      expect(mockUsersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ clinicId: TARGET_CLINIC_ID }),
        TARGET_CLINIC_ID,
      )
      expect(result.id).toBe(createdUser.id)
    })

    it('throws UnprocessableEntityException when clinicId is absent for non-platform-admin role', async () => {
      await expect(
        useCase.execute(
          { fullName: 'Alice', email: 'a@b.com', password: 'Password123', role: UserRole.ADMIN },
          platformAdminUser,
        ),
      ).rejects.toThrow(UnprocessableEntityException)

      expect(mockUsersRepository.create).not.toHaveBeenCalled()
    })

    it('creates PLATFORM_ADMIN user with null clinicId without requiring clinicId in DTO', async () => {
      const dto = {
        fullName: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password({ length: 10 }),
        role: UserRole.PLATFORM_ADMIN,
      }
      const createdUser = {
        id: faker.string.uuid(),
        fullName: dto.fullName,
        email: dto.email,
        password: 'hashed',
        role: UserRole.PLATFORM_ADMIN,
        isActive: true,
        clinicId: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as unknown as User

      mockUsersRepository.findByEmail.mockResolvedValue(null)
      mockUsersRepository.create.mockResolvedValue(createdUser)
      mockCacheService.delByPattern.mockResolvedValue(undefined)

      const result = await useCase.execute(dto, platformAdminUser)

      expect(mockUsersRepository.create).toHaveBeenCalledWith(expect.any(Object), null)
      expect(result.role).toBe(UserRole.PLATFORM_ADMIN)
    })
  })

  it('does not throw when cache invalidation fails', async () => {
    const dto = { fullName: 'Eve', email: 'e@f.com', password: 'Password123', role: UserRole.USER }
    const user = { ...dto, id: 'u4', password: 'hash', isActive: true, clinicId: CLINIC_ID, version: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null } as unknown as User

    mockUsersRepository.findByEmail.mockResolvedValue(null)
    mockUsersRepository.create.mockResolvedValue(user)
    mockCacheService.delByPattern.mockRejectedValue(new Error('Redis down'))

    await expect(useCase.execute(dto, adminCurrentUser)).resolves.toBeDefined()
  })
})
