import { NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { INotificationAdapter } from '../adapters/notification.adapter.interface'
import { IUsersRepository } from '../repositories/users.repository.interface'
import { ActivateUserUseCase } from '../use-cases/activate-user.use-case'

const mockUsersRepository: jest.Mocked<IUsersRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockNotificationAdapter = {
  sendAccountActivationEmail: jest.fn(),
} as unknown as jest.Mocked<INotificationAdapter>

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setIfNotExists: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const CLINIC_ID = 'fixed-clinic-uuid'
const adminCurrentUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

const makeUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  fullName: faker.person.fullName(),
  email: faker.internet.email(),
  password: 'hashed',
  role: UserRole.USER,
  isActive: false,
  clinicId: CLINIC_ID,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

describe('ActivateUserUseCase', () => {
  let useCase: ActivateUserUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ActivateUserUseCase(
      {} as DataSource,
      mockUsersRepository,
      mockNotificationAdapter,
      mockCacheService,
    )
  })

  it('activates user and returns response with isActive true', async () => {
    const user = makeUser()
    const activated = { ...user, isActive: true }
    mockUsersRepository.findById.mockResolvedValue(user as any)
    mockUsersRepository.update.mockResolvedValue(activated as any)
    mockNotificationAdapter.sendAccountActivationEmail.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(user.id, adminCurrentUser)

    expect(result.isActive).toBe(true)
    expect(result.id).toBe(user.id)
    expect(result).not.toHaveProperty('password')
    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('calls update with isActive true', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user as any)
    mockUsersRepository.update.mockResolvedValue({ ...user, isActive: true } as any)
    mockNotificationAdapter.sendAccountActivationEmail.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(user.id, adminCurrentUser)

    expect(mockUsersRepository.update).toHaveBeenCalledWith(user.id, { isActive: true })
  })

  it('throws NotFoundException when user does not exist', async () => {
    mockUsersRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid(), adminCurrentUser)).rejects.toThrow(NotFoundException)
    expect(mockUsersRepository.update).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when user is already active', async () => {
    const user = makeUser({ isActive: true })
    mockUsersRepository.findById.mockResolvedValue(user as any)

    await expect(useCase.execute(user.id, adminCurrentUser)).rejects.toThrow(UnprocessableEntityException)
    expect(mockUsersRepository.update).not.toHaveBeenCalled()
  })

  it('sends activation email after updating user', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user as any)
    mockUsersRepository.update.mockResolvedValue({ ...user, isActive: true } as any)
    mockNotificationAdapter.sendAccountActivationEmail.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(user.id, adminCurrentUser)

    expect(mockNotificationAdapter.sendAccountActivationEmail).toHaveBeenCalledWith(
      user.email,
      user.fullName,
    )
  })

  it('continues and returns response when email sending fails', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user as any)
    mockUsersRepository.update.mockResolvedValue({ ...user, isActive: true } as any)
    mockNotificationAdapter.sendAccountActivationEmail.mockRejectedValue(new Error('SMTP error'))
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(user.id, adminCurrentUser)

    expect(result.id).toBe(user.id)
  })

  it('invalidates individual and list caches with clinicId-scoped keys after activation', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user as any)
    mockUsersRepository.update.mockResolvedValue({ ...user, isActive: true } as any)
    mockNotificationAdapter.sendAccountActivationEmail.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(user.id, adminCurrentUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`user:${CLINIC_ID}:${user.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`users:list:${CLINIC_ID}*`)
  })

  it('continues and returns response when cache invalidation fails', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user as any)
    mockUsersRepository.update.mockResolvedValue({ ...user, isActive: true } as any)
    mockNotificationAdapter.sendAccountActivationEmail.mockResolvedValue(undefined)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(user.id, adminCurrentUser)

    expect(result.id).toBe(user.id)
  })
})
