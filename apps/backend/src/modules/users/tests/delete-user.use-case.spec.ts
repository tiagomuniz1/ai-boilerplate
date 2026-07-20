import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource, QueryRunner } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { DeleteUserUseCase } from '../use-cases/delete-user.use-case'
import { IUsersRepository } from '../repositories/users.repository.interface'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { DeleteProfessionalUseCase } from '../../professionals/use-cases/delete-professional.use-case'
import { DeletePatientUseCase } from '../../patients/use-cases/delete-patient.use-case'
import { User } from '../entities/user.entity'

const mockQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: {},
} as unknown as QueryRunner

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
} as unknown as DataSource

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

const mockDeleteProfessionalUseCase = {
  deleteByUserId: jest.fn(),
} as unknown as jest.Mocked<DeleteProfessionalUseCase>

const mockDeletePatientUseCase = {
  deleteByUserId: jest.fn(),
} as unknown as jest.Mocked<DeletePatientUseCase>

const CLINIC_ID = 'fixed-clinic-uuid'

function makeUser(): User {
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
  } as User
}

const adminCurrentUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }
const targetUser = makeUser()

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteUserUseCase(
      mockDataSource,
      mockUsersRepository,
      mockCacheService,
      mockDeleteProfessionalUseCase,
      mockDeletePatientUseCase,
    )
    mockUsersRepository.delete.mockResolvedValue(undefined)
    mockDeleteProfessionalUseCase.deleteByUserId.mockResolvedValue(undefined)
    mockDeletePatientUseCase.deleteByUserId.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
  })

  it('throws ForbiddenException when trying to delete own account', async () => {
    const selfCurrentUser: ICurrentUser = { id: 'self-id', role: UserRole.ADMIN, clinicId: CLINIC_ID }

    await expect(useCase.execute('self-id', selfCurrentUser)).rejects.toThrow(ForbiddenException)
    expect(mockUsersRepository.findById).not.toHaveBeenCalled()
    expect(mockUsersRepository.delete).not.toHaveBeenCalled()
  })

  it('deletes user and cascades to doctor and patient in a transaction', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)

    await expect(useCase.execute(user.id, adminCurrentUser)).resolves.toBeUndefined()

    expect(mockDeleteProfessionalUseCase.deleteByUserId).toHaveBeenCalledWith(user.id, CLINIC_ID, mockQueryRunner)
    expect(mockDeletePatientUseCase.deleteByUserId).toHaveBeenCalledWith(user.id, CLINIC_ID, mockQueryRunner)
    expect(mockUsersRepository.delete).toHaveBeenCalledWith(user.id, mockQueryRunner)
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
  })

  it('throws NotFoundException when user does not exist', async () => {
    mockUsersRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(targetUser.id, adminCurrentUser)).rejects.toThrow(NotFoundException)
    expect(mockUsersRepository.delete).not.toHaveBeenCalled()
    expect(mockDeleteProfessionalUseCase.deleteByUserId).not.toHaveBeenCalled()
    expect(mockDeletePatientUseCase.deleteByUserId).not.toHaveBeenCalled()
  })

  it('rolls back transaction and rethrows when user delete fails', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockUsersRepository.delete.mockRejectedValue(new Error('DB error'))

    await expect(useCase.execute(user.id, adminCurrentUser)).rejects.toThrow('DB error')
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled()
    expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled()
  })

  it('invalidates individual and list cache with clinicId-scoped keys after deletion', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)

    await useCase.execute(user.id, adminCurrentUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`user:${CLINIC_ID}:${user.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`users:list:${CLINIC_ID}*`)
  })

  it('does not throw when cache invalidation fails', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockCacheService.del.mockRejectedValue(new Error('Redis down'))

    await expect(useCase.execute(user.id, adminCurrentUser)).resolves.toBeUndefined()
  })
})
