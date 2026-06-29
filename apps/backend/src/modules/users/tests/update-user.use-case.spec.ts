import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { UpdateUserUseCase } from '../use-cases/update-user.use-case'
import { IUsersRepository } from '../repositories/users.repository.interface'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
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
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawResult),
  }
}

function makeMockDataSource(
  isDoctorResult: unknown[] = [],
  isPatientResult: unknown[] = [],
): DataSource {
  return {
    createQueryBuilder: jest.fn()
      .mockReturnValueOnce(makeQueryBuilder(isDoctorResult))
      .mockReturnValueOnce(makeQueryBuilder(isPatientResult)),
    createQueryRunner: jest.fn(),
  } as unknown as DataSource
}

const CLINIC_ID = 'fixed-clinic-uuid'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    fullName: faker.person.fullName(),
    email: faker.internet.email(),
    password: 'hash',
    role: UserRole.USER,
    isActive: true,
    clinicId: CLINIC_ID,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as User
}

const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdateUserUseCase(makeMockDataSource(), mockUsersRepository, mockCacheService)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
  })

  it('updates user and returns UserResponseDto', async () => {
    const user = makeUser()
    const updated = { ...user, fullName: 'New Name' }
    mockUsersRepository.findById.mockResolvedValue(user)
    mockUsersRepository.update.mockResolvedValue(updated)

    const result = await useCase.execute(user.id, { fullName: 'New Name' }, adminUser)

    expect(result.fullName).toBe('New Name')
    expect(result.isActive).toBe(true)
    expect(result).not.toHaveProperty('password')
    expect(result).not.toHaveProperty('version')
  })

  it('response includes isDoctor and isPatient flags', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockUsersRepository.update.mockResolvedValue(user)

    const result = await useCase.execute(user.id, { fullName: 'X' }, adminUser)

    expect(result.isDoctor).toBe(false)
    expect(result.isPatient).toBe(false)
  })

  it('can update isActive to false', async () => {
    const user = makeUser({ isActive: true })
    const updated = { ...user, isActive: false }
    mockUsersRepository.findById.mockResolvedValue(user)
    mockUsersRepository.update.mockResolvedValue(updated)

    const result = await useCase.execute(user.id, { isActive: false }, adminUser)

    expect(result.isActive).toBe(false)
  })

  it('throws NotFoundException when user does not exist', async () => {
    mockUsersRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute('nonexistent', { fullName: 'X' }, adminUser)).rejects.toThrow(NotFoundException)
    expect(mockUsersRepository.update).not.toHaveBeenCalled()
  })

  it('throws ConflictException when new email is already in use by another user', async () => {
    const user = makeUser({ email: 'original@example.com' })
    const otherUser = makeUser({ email: 'taken@example.com' })
    mockUsersRepository.findById.mockResolvedValue(user)
    mockUsersRepository.findByEmail.mockResolvedValue(otherUser)

    await expect(useCase.execute(user.id, { email: 'taken@example.com' }, adminUser)).rejects.toThrow(ConflictException)
    expect(mockUsersRepository.update).not.toHaveBeenCalled()
  })

  it('does not check email uniqueness when email is unchanged', async () => {
    const user = makeUser({ email: 'same@example.com' })
    const updated = { ...user }
    mockUsersRepository.findById.mockResolvedValue(user)
    mockUsersRepository.update.mockResolvedValue(updated)

    await useCase.execute(user.id, { email: 'same@example.com' }, adminUser)

    expect(mockUsersRepository.findByEmail).not.toHaveBeenCalled()
  })

  it('converts OptimisticLockVersionMismatchError to ConflictException', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockUsersRepository.update.mockRejectedValue(new OptimisticLockVersionMismatchError('User', 1, 2))

    await expect(useCase.execute(user.id, { fullName: 'X' }, adminUser)).rejects.toThrow(ConflictException)
  })

  it('re-throws unknown errors from repository', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockUsersRepository.update.mockRejectedValue(new Error('DB failure'))

    await expect(useCase.execute(user.id, { fullName: 'X' }, adminUser)).rejects.toThrow('DB failure')
  })

  it('invalidates individual and list cache with clinicId-scoped keys after update', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockUsersRepository.update.mockResolvedValue(user)

    await useCase.execute(user.id, { fullName: 'X' }, adminUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`user:${CLINIC_ID}:${user.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`users:list:${CLINIC_ID}*`)
  })

  it('does not throw when cache invalidation fails', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockUsersRepository.update.mockResolvedValue(user)
    mockCacheService.del.mockRejectedValue(new Error('Redis down'))

    await expect(useCase.execute(user.id, { fullName: 'X' }, adminUser)).resolves.toBeDefined()
  })

  it('allows DOCTOR to update their own profile', async () => {
    const user = makeUser()
    const doctorUser: ICurrentUser = { id: user.id, role: UserRole.DOCTOR, clinicId: CLINIC_ID }
    const updated = { ...user, fullName: 'Updated Name' }
    mockUsersRepository.findById.mockResolvedValue(user)
    mockUsersRepository.update.mockResolvedValue(updated)

    const result = await useCase.execute(user.id, { fullName: 'Updated Name' }, doctorUser)

    expect(result.id).toBe(user.id)
  })

  it('throws ForbiddenException when DOCTOR tries to update another user profile', async () => {
    const doctorUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.DOCTOR, clinicId: CLINIC_ID }
    const otherId = faker.string.uuid()

    await expect(useCase.execute(otherId, { fullName: 'X' }, doctorUser)).rejects.toThrow(ForbiddenException)
    expect(mockUsersRepository.findById).not.toHaveBeenCalled()
  })

  it('allows USER to update their own profile', async () => {
    const user = makeUser()
    const currentUser: ICurrentUser = { id: user.id, role: UserRole.USER, clinicId: CLINIC_ID }
    const updated = { ...user, fullName: 'Updated Name' }
    mockUsersRepository.findById.mockResolvedValue(user)
    mockUsersRepository.update.mockResolvedValue(updated)

    const result = await useCase.execute(user.id, { fullName: 'Updated Name' }, currentUser)

    expect(result.id).toBe(user.id)
  })

  it('throws ForbiddenException when USER tries to update another user profile', async () => {
    const currentUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.USER, clinicId: CLINIC_ID }
    const otherId = faker.string.uuid()

    await expect(useCase.execute(otherId, { fullName: 'X' }, currentUser)).rejects.toThrow(ForbiddenException)
  })
})
