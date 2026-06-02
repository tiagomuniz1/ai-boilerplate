import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource, QueryRunner } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { DeleteScheduleUseCase } from '../../schedules/use-cases/delete-schedule.use-case'
import { IDoctorsRepository } from '../repositories/doctors.repository.interface'
import { DeleteDoctorUseCase } from '../use-cases/delete-doctor.use-case'

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

const mockDoctorsRepository: jest.Mocked<IDoctorsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByCrmNumber: jest.fn(),
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

const mockUsersRepository: jest.Mocked<IUsersRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockDeleteScheduleUseCase = {
  deleteByDoctorId: jest.fn(),
} as unknown as jest.Mocked<DeleteScheduleUseCase>

const makeDoctor = (role = UserRole.DOCTOR) => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  user: { id: faker.string.uuid(), fullName: faker.person.fullName(), email: faker.internet.email(), role } as any,
  crmNumber: '12345/SP',
  specialties: [{ id: faker.string.uuid(), name: 'Cardiologia' }],
  bio: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
})

const OTHER_USER_ID = faker.string.uuid()

describe('DeleteDoctorUseCase', () => {
  let useCase: DeleteDoctorUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteDoctorUseCase(
      mockDataSource,
      mockDoctorsRepository,
      mockUsersRepository,
      mockCacheService,
      mockDeleteScheduleUseCase,
    )
    mockDeleteScheduleUseCase.deleteByDoctorId.mockResolvedValue(undefined)
    mockDoctorsRepository.delete.mockResolvedValue(undefined)
    mockUsersRepository.delete.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
  })

  it('cascades to schedules, deletes doctor and linked DOCTOR-role user in a transaction', async () => {
    const doctor = makeDoctor(UserRole.DOCTOR)
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)

    await expect(useCase.execute(doctor.id, OTHER_USER_ID)).resolves.toBeUndefined()

    expect(mockDeleteScheduleUseCase.deleteByDoctorId).toHaveBeenCalledWith(doctor.id, mockQueryRunner)
    expect(mockDoctorsRepository.delete).toHaveBeenCalledWith(doctor.id, mockQueryRunner)
    expect(mockUsersRepository.delete).toHaveBeenCalledWith(doctor.userId, mockQueryRunner)
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
  })

  it('does not delete linked user when user role is not DOCTOR', async () => {
    const doctor = makeDoctor(UserRole.ADMIN)
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)

    await useCase.execute(doctor.id, OTHER_USER_ID)

    expect(mockDoctorsRepository.delete).toHaveBeenCalledWith(doctor.id, mockQueryRunner)
    expect(mockUsersRepository.delete).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when trying to delete own doctor profile', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)

    await expect(useCase.execute(doctor.id, doctor.userId)).rejects.toThrow(ForbiddenException)
    expect(mockDoctorsRepository.delete).not.toHaveBeenCalled()
    expect(mockUsersRepository.delete).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when doctor does not exist', async () => {
    mockDoctorsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid(), OTHER_USER_ID)).rejects.toThrow(NotFoundException)
    expect(mockDoctorsRepository.delete).not.toHaveBeenCalled()
    expect(mockUsersRepository.delete).not.toHaveBeenCalled()
    expect(mockDeleteScheduleUseCase.deleteByDoctorId).not.toHaveBeenCalled()
  })

  it('rolls back transaction and rethrows when doctor delete fails', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.delete.mockRejectedValue(new Error('DB error'))

    await expect(useCase.execute(doctor.id, OTHER_USER_ID)).rejects.toThrow('DB error')
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled()
    expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled()
  })

  it('invalidates doctor and user caches after deletion of DOCTOR-role user', async () => {
    const doctor = makeDoctor(UserRole.DOCTOR)
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)

    await useCase.execute(doctor.id, OTHER_USER_ID)

    expect(mockCacheService.del).toHaveBeenCalledWith(`doctor:${doctor.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('doctors:list*')
    expect(mockCacheService.del).toHaveBeenCalledWith(`user:${doctor.userId}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('users:list*')
  })

  it('invalidates only doctor cache when linked user role is not DOCTOR', async () => {
    const doctor = makeDoctor(UserRole.ADMIN)
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)

    await useCase.execute(doctor.id, OTHER_USER_ID)

    expect(mockCacheService.del).toHaveBeenCalledWith(`doctor:${doctor.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('doctors:list*')
    expect(mockCacheService.del).not.toHaveBeenCalledWith(`user:${doctor.userId}`)
    expect(mockCacheService.delByPattern).not.toHaveBeenCalledWith('users:list*')
  })

  it('continues when cache invalidation fails', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute(doctor.id, OTHER_USER_ID)).resolves.toBeUndefined()
  })

  describe('deleteByUserId', () => {
    it('cascades to schedules and deletes doctor when found', async () => {
      const userId = faker.string.uuid()
      const doctor = makeDoctor()
      mockDoctorsRepository.findByUserId.mockResolvedValue(doctor as any)

      await useCase.deleteByUserId(userId)

      expect(mockDeleteScheduleUseCase.deleteByDoctorId).toHaveBeenCalledWith(doctor.id, undefined)
      expect(mockDoctorsRepository.delete).toHaveBeenCalledWith(doctor.id, undefined)
    })

    it('does nothing when no doctor with userId exists', async () => {
      mockDoctorsRepository.findByUserId.mockResolvedValue(null)

      await expect(useCase.deleteByUserId(faker.string.uuid())).resolves.toBeUndefined()
      expect(mockDeleteScheduleUseCase.deleteByDoctorId).not.toHaveBeenCalled()
      expect(mockDoctorsRepository.delete).not.toHaveBeenCalled()
    })

    it('passes queryRunner to schedule and doctor delete', async () => {
      const userId = faker.string.uuid()
      const doctor = makeDoctor()
      const queryRunner = {} as any
      mockDoctorsRepository.findByUserId.mockResolvedValue(doctor as any)

      await useCase.deleteByUserId(userId, queryRunner)

      expect(mockDeleteScheduleUseCase.deleteByDoctorId).toHaveBeenCalledWith(doctor.id, queryRunner)
      expect(mockDoctorsRepository.delete).toHaveBeenCalledWith(doctor.id, queryRunner)
    })

    it('continues without throwing when cache invalidation fails', async () => {
      const doctor = makeDoctor()
      mockDoctorsRepository.findByUserId.mockResolvedValue(doctor as any)
      mockCacheService.del.mockRejectedValue(new Error('Redis error'))

      await expect(useCase.deleteByUserId(faker.string.uuid())).resolves.toBeUndefined()
    })
  })
})
