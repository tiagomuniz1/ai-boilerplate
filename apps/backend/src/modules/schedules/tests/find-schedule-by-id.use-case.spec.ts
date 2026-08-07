import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { DayOfWeek, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { ISchedulesRepository } from '../repositories/schedules.repository.interface'
import { FindScheduleByIdUseCase } from '../use-cases/find-schedule-by-id.use-case'

const mockSchedulesRepository: jest.Mocked<ISchedulesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findOverlapping: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deleteAllByProfessionalId: jest.fn(),
  findActiveByProfessionalAndDate: jest.fn(),
}

const mockProfessionalsRepository: jest.Mocked<IProfessionalsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByRegistration: jest.fn(),
  countByClinic: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPrefix: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const ownerId = faker.string.uuid()
const otherDoctorId = faker.string.uuid()

const ownerUser: ICurrentUser = { id: ownerId, role: UserRole.PROFESSIONAL, clinicId: faker.string.uuid() }
const otherDoctorUser: ICurrentUser = { id: otherDoctorId, role: UserRole.PROFESSIONAL, clinicId: faker.string.uuid() }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: faker.string.uuid() }

const makeSchedule = (overrides = {}) => ({
  id: faker.string.uuid(),
  professionalId: ownerId,
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
  validFrom: null,
  validUntil: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

function makeMockDataSource(): DataSource {
  const builder = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([{ fullName: 'Dr. Test Doctor' }]),
  }
  return { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as DataSource
}

describe('FindScheduleByIdUseCase', () => {
  let useCase: FindScheduleByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindScheduleByIdUseCase(
      makeMockDataSource(),
      mockSchedulesRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
    mockProfessionalsRepository.findByUserId.mockImplementation((userId: string) =>
      Promise.resolve({ id: userId } as any),
    )
  })

  it('throws NotFoundException when doctor has no profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    await expect(useCase.execute(faker.string.uuid(), ownerUser)).rejects.toThrow(NotFoundException)
    expect(mockSchedulesRepository.findById).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when schedule not found', async () => {
    mockSchedulesRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute(faker.string.uuid(), ownerUser)).rejects.toThrow(NotFoundException)
  })

  it('returns schedule when doctor is the owner', async () => {
    const schedule = makeSchedule()
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)

    const result = await useCase.execute(schedule.id, ownerUser)

    expect(result.id).toBe(schedule.id)
    expect(result.professionalId).toBe(ownerId)
  })

  it('throws ForbiddenException when doctor tries to view another doctor schedule', async () => {
    const schedule = makeSchedule()
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)

    await expect(useCase.execute(schedule.id, otherDoctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('allows admin to view any schedule', async () => {
    const schedule = makeSchedule()
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)

    const result = await useCase.execute(schedule.id, adminUser)

    expect(result.id).toBe(schedule.id)
  })

  it('returns cached result on cache hit', async () => {
    const schedule = makeSchedule()
    const cachedResponse = {
      id: schedule.id,
      professionalId: ownerId,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '08:00',
      endTime: '12:00',
      slotDurationInMinutes: 30,
      validFrom: null,
      validUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockCacheService.get.mockResolvedValue(cachedResponse)

    const result = await useCase.execute(schedule.id, ownerUser)

    expect(result).toBe(cachedResponse)
    expect(mockSchedulesRepository.findById).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException from cache when doctor accesses wrong schedule', async () => {
    const cachedResponse = {
      id: faker.string.uuid(),
      professionalId: ownerId,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '08:00',
      endTime: '12:00',
      slotDurationInMinutes: 30,
      validFrom: null,
      validUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockCacheService.get.mockResolvedValue(cachedResponse)

    await expect(useCase.execute(faker.string.uuid(), otherDoctorUser)).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('continues on cache read failure', async () => {
    const schedule = makeSchedule()
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)

    const result = await useCase.execute(schedule.id, ownerUser)

    expect(result.id).toBe(schedule.id)
  })

  it('continues and returns response when cache write fails after DB fetch', async () => {
    const schedule = makeSchedule()
    mockCacheService.get.mockResolvedValue(null)
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)
    mockCacheService.set.mockRejectedValue(new Error('Redis write error'))

    const result = await useCase.execute(schedule.id, ownerUser)

    expect(result.id).toBe(schedule.id)
  })

  it('response does not contain version or deletedAt', async () => {
    const schedule = makeSchedule()
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)

    const result = await useCase.execute(schedule.id, ownerUser)

    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('returns empty professionalName when name query returns no rows', async () => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    }
    const emptyDataSource = { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as DataSource
    const useCaseWithEmptyNames = new FindScheduleByIdUseCase(
      emptyDataSource,
      mockSchedulesRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )
    const schedule = makeSchedule()
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)

    const result = await useCaseWithEmptyNames.execute(schedule.id, ownerUser)

    expect(result.professionalName).toBe('')
  })
})
