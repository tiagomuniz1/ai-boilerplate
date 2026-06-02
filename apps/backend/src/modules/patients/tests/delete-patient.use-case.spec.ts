import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { PatientGender } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { IPatientsRepository } from '../repositories/patients.repository.interface'
import { DeletePatientUseCase } from '../use-cases/delete-patient.use-case'

const mockPatientsRepository: jest.Mocked<IPatientsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByDocumentNumber: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
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

const mockQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
}

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
} as unknown as DataSource

const makePatient = () => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  user: { id: faker.string.uuid(), fullName: faker.person.fullName(), email: faker.internet.email() } as any,
  documentNumber: '12345678901',
  phoneNumber: '(11) 99999-9999',
  birthDate: '1990-05-15',
  gender: PatientGender.MALE,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
})

const OTHER_USER_ID = faker.string.uuid()

describe('DeletePatientUseCase', () => {
  let useCase: DeletePatientUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeletePatientUseCase(
      mockDataSource,
      mockPatientsRepository,
      mockUsersRepository,
      mockCacheService,
    )
  })

  it('throws ForbiddenException when trying to delete own patient record', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)

    await expect(useCase.execute(patient.id, patient.userId)).rejects.toThrow(ForbiddenException)
    expect(mockPatientsRepository.delete).not.toHaveBeenCalled()
    expect(mockUsersRepository.delete).not.toHaveBeenCalled()
  })

  it('deletes patient and linked user in transaction', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockPatientsRepository.delete.mockResolvedValue(undefined)
    mockUsersRepository.delete.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(patient.id, OTHER_USER_ID)

    expect(mockPatientsRepository.findById).toHaveBeenCalledWith(patient.id)
    expect(mockPatientsRepository.delete).toHaveBeenCalledWith(patient.id, expect.anything())
    expect(mockUsersRepository.delete).toHaveBeenCalledWith(patient.userId, expect.anything())
  })

  it('invalidates patient and user caches after deletion', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockPatientsRepository.delete.mockResolvedValue(undefined)
    mockUsersRepository.delete.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(patient.id, OTHER_USER_ID)

    expect(mockCacheService.del).toHaveBeenCalledWith(`patient:${patient.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('patients:list*')
    expect(mockCacheService.del).toHaveBeenCalledWith(`user:${patient.userId}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('users:list*')
  })

  it('throws NotFoundException when patient does not exist', async () => {
    mockPatientsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid(), OTHER_USER_ID)).rejects.toThrow(NotFoundException)
    expect(mockPatientsRepository.delete).not.toHaveBeenCalled()
    expect(mockUsersRepository.delete).not.toHaveBeenCalled()
  })

  it('continues without throwing when cache invalidation fails', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockPatientsRepository.delete.mockResolvedValue(undefined)
    mockUsersRepository.delete.mockResolvedValue(undefined)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute(patient.id, OTHER_USER_ID)).resolves.toBeUndefined()
  })

  it('returns void on success', async () => {
    const patient = makePatient()
    mockPatientsRepository.findById.mockResolvedValue(patient as any)
    mockPatientsRepository.delete.mockResolvedValue(undefined)
    mockUsersRepository.delete.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(patient.id, OTHER_USER_ID)

    expect(result).toBeUndefined()
  })

  describe('deleteByUserId', () => {
    it('deletes and invalidates cache when patient with userId exists', async () => {
      const userId = faker.string.uuid()
      const patient = makePatient()
      mockPatientsRepository.findByUserId.mockResolvedValue(patient as any)
      mockPatientsRepository.delete.mockResolvedValue(undefined)
      mockCacheService.del.mockResolvedValue(undefined)
      mockCacheService.delByPattern.mockResolvedValue(undefined)

      await useCase.deleteByUserId(userId)

      expect(mockPatientsRepository.findByUserId).toHaveBeenCalledWith(userId)
      expect(mockPatientsRepository.delete).toHaveBeenCalledWith(patient.id, undefined)
      expect(mockCacheService.del).toHaveBeenCalledWith(`patient:${patient.id}`)
      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('patients:list*')
    })

    it('does nothing when no patient with userId exists', async () => {
      mockPatientsRepository.findByUserId.mockResolvedValue(null)

      await expect(useCase.deleteByUserId(faker.string.uuid())).resolves.toBeUndefined()
      expect(mockPatientsRepository.delete).not.toHaveBeenCalled()
    })

    it('passes queryRunner to repository when provided', async () => {
      const userId = faker.string.uuid()
      const patient = makePatient()
      const queryRunner = {} as any
      mockPatientsRepository.findByUserId.mockResolvedValue(patient as any)
      mockPatientsRepository.delete.mockResolvedValue(undefined)

      await useCase.deleteByUserId(userId, queryRunner)

      expect(mockPatientsRepository.delete).toHaveBeenCalledWith(patient.id, queryRunner)
    })

    it('continues without throwing when cache invalidation fails', async () => {
      const patient = makePatient()
      mockPatientsRepository.findByUserId.mockResolvedValue(patient as any)
      mockPatientsRepository.delete.mockResolvedValue(undefined)
      mockCacheService.del.mockRejectedValue(new Error('Redis error'))

      await expect(useCase.deleteByUserId(faker.string.uuid())).resolves.toBeUndefined()
    })
  })
})
