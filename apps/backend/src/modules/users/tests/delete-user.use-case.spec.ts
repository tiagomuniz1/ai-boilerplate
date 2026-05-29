import { NotFoundException } from '@nestjs/common'
import { DataSource, QueryRunner } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { DeleteUserUseCase } from '../use-cases/delete-user.use-case'
import { IUsersRepository } from '../repositories/users.repository.interface'
import { CacheService } from '../../../cache/cache.service'
import { DeleteDoctorUseCase } from '../../doctors/use-cases/delete-doctor.use-case'
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
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setIfNotExists: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const mockDeleteDoctorUseCase = {
  deleteByUserId: jest.fn(),
} as unknown as jest.Mocked<DeleteDoctorUseCase>

const mockDeletePatientUseCase = {
  deleteByUserId: jest.fn(),
} as unknown as jest.Mocked<DeletePatientUseCase>

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

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteUserUseCase(
      mockDataSource,
      mockUsersRepository,
      mockCacheService,
      mockDeleteDoctorUseCase,
      mockDeletePatientUseCase,
    )
    mockUsersRepository.delete.mockResolvedValue(undefined)
    mockDeleteDoctorUseCase.deleteByUserId.mockResolvedValue(undefined)
    mockDeletePatientUseCase.deleteByUserId.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
  })

  it('deletes user and cascades to doctor and patient in a transaction', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)

    await expect(useCase.execute(user.id)).resolves.toBeUndefined()

    expect(mockDeleteDoctorUseCase.deleteByUserId).toHaveBeenCalledWith(user.id, mockQueryRunner)
    expect(mockDeletePatientUseCase.deleteByUserId).toHaveBeenCalledWith(user.id, mockQueryRunner)
    expect(mockUsersRepository.delete).toHaveBeenCalledWith(user.id, mockQueryRunner)
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
  })

  it('throws NotFoundException when user does not exist', async () => {
    mockUsersRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute('nonexistent')).rejects.toThrow(NotFoundException)
    expect(mockUsersRepository.delete).not.toHaveBeenCalled()
    expect(mockDeleteDoctorUseCase.deleteByUserId).not.toHaveBeenCalled()
    expect(mockDeletePatientUseCase.deleteByUserId).not.toHaveBeenCalled()
  })

  it('rolls back transaction and rethrows when user delete fails', async () => {
    const user = makeUser()
    mockUsersRepository.findById.mockResolvedValue(user)
    mockUsersRepository.delete.mockRejectedValue(new Error('DB error'))

    await expect(useCase.execute(user.id)).rejects.toThrow('DB error')
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled()
    expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled()
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
