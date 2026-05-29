import { NotFoundException } from '@nestjs/common'
import { DataSource, QueryRunner } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
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

const mockDeleteScheduleUseCase = {
  deleteByDoctorId: jest.fn(),
} as unknown as jest.Mocked<DeleteScheduleUseCase>

const makeDoctor = () => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  user: { id: faker.string.uuid(), fullName: faker.person.fullName(), email: faker.internet.email() } as any,
  crmNumber: '12345/SP',
  specialties: [{ id: faker.string.uuid(), name: 'Cardiologia' }],
  bio: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
})

describe('DeleteDoctorUseCase', () => {
  let useCase: DeleteDoctorUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteDoctorUseCase(
      mockDataSource,
      mockDoctorsRepository,
      mockCacheService,
      mockDeleteScheduleUseCase,
    )
    mockDeleteScheduleUseCase.deleteByDoctorId.mockResolvedValue(undefined)
    mockDoctorsRepository.delete.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
  })

  it('cascades to schedules and deletes doctor in a transaction', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)

    await expect(useCase.execute(doctor.id)).resolves.toBeUndefined()

    expect(mockDeleteScheduleUseCase.deleteByDoctorId).toHaveBeenCalledWith(doctor.id, mockQueryRunner)
    expect(mockDoctorsRepository.delete).toHaveBeenCalledWith(doctor.id, mockQueryRunner)
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
  })

  it('throws NotFoundException when doctor does not exist', async () => {
    mockDoctorsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid())).rejects.toThrow(NotFoundException)
    expect(mockDoctorsRepository.delete).not.toHaveBeenCalled()
    expect(mockDeleteScheduleUseCase.deleteByDoctorId).not.toHaveBeenCalled()
  })

  it('rolls back transaction and rethrows when doctor delete fails', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockDoctorsRepository.delete.mockRejectedValue(new Error('DB error'))

    await expect(useCase.execute(doctor.id)).rejects.toThrow('DB error')
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled()
    expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled()
  })

  it('invalidates individual and list caches after deletion', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)

    await useCase.execute(doctor.id)

    expect(mockCacheService.del).toHaveBeenCalledWith(`doctor:${doctor.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('doctors:list*')
  })

  it('continues when cache invalidation fails', async () => {
    const doctor = makeDoctor()
    mockDoctorsRepository.findById.mockResolvedValue(doctor as any)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute(doctor.id)).resolves.toBeUndefined()
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
