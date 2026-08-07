import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { DayOfWeek, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { ISchedulesRepository } from '../repositories/schedules.repository.interface'
import { ListSchedulesUseCase } from '../use-cases/list-schedules.use-case'
import { ListSchedulesQueryDto } from '../dto/list-schedules-query.dto'

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

const CLINIC_ID = 'fixed-clinic-uuid'
const professionalId = faker.string.uuid()
const doctorUser: ICurrentUser = { id: professionalId, role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

const makeSchedule = (overrides = {}) => ({
  id: faker.string.uuid(),
  professionalId,
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

function makeMockDataSource(professionalName = 'Dr. Test Doctor'): DataSource {
  const builder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([{ professionalId, fullName: professionalName }]),
  }
  return { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as DataSource
}

describe('ListSchedulesUseCase', () => {
  let useCase: ListSchedulesUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ListSchedulesUseCase(
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

  it('throws NotFoundException when DOCTOR has no profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    await expect(useCase.execute({ page: 1, limit: 20 }, doctorUser)).rejects.toThrow(NotFoundException)
    expect(mockSchedulesRepository.findAll).not.toHaveBeenCalled()
  })

  it('forces professionalId to currentUser.id for DOCTOR role', async () => {
    const schedule = makeSchedule()
    mockSchedulesRepository.findAll.mockResolvedValue([[schedule as any], 1])

    const query: ListSchedulesQueryDto = { page: 1, limit: 20, professionalId: faker.string.uuid() }
    await useCase.execute(query, doctorUser)

    expect(mockSchedulesRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ professionalId }),
      CLINIC_ID,
    )
  })

  it('returns all schedules when admin provides no professionalId', async () => {
    mockSchedulesRepository.findAll.mockResolvedValue([[], 0])

    const query: ListSchedulesQueryDto = { page: 1, limit: 20 }
    await useCase.execute(query, adminUser)

    const calledWith = mockSchedulesRepository.findAll.mock.calls[0][0]
    expect(calledWith.professionalId).toBeUndefined()
  })

  it('does not pass activeOn to repository when not provided', async () => {
    mockSchedulesRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute({ page: 1, limit: 20 }, doctorUser)

    const calledWith = mockSchedulesRepository.findAll.mock.calls[0][0]
    expect(calledWith.activeOn).toBeUndefined()
  })

  it('passes provided activeOn to repository without modification', async () => {
    const specificDate = '2024-01-15'
    mockSchedulesRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute({ page: 1, limit: 20, activeOn: specificDate }, doctorUser)

    expect(mockSchedulesRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ activeOn: specificDate }),
      CLINIC_ID,
    )
  })

  it('returns cached result on cache hit', async () => {
    const cached = { data: [], total: 0, page: 1, limit: 20 }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute({ page: 1, limit: 20 }, doctorUser)

    expect(result).toBe(cached)
    expect(mockSchedulesRepository.findAll).not.toHaveBeenCalled()
  })

  it('cache key includes dayOfWeek to avoid collision', async () => {
    mockSchedulesRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute({ page: 1, limit: 20, dayOfWeek: DayOfWeek.MONDAY }, doctorUser)

    expect(mockCacheService.get).toHaveBeenCalledWith(
      `schedules:list:${CLINIC_ID}:${professionalId}:MONDAY:all:1:20`,
    )
  })

  it('cache key uses "all" when no dayOfWeek provided', async () => {
    mockSchedulesRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute({ page: 1, limit: 20 }, doctorUser)

    expect(mockCacheService.get).toHaveBeenCalledWith(
      `schedules:list:${CLINIC_ID}:${professionalId}:all:all:1:20`,
    )
  })

  it('cache key uses "all" for admin without professionalId', async () => {
    mockSchedulesRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute({ page: 1, limit: 20 }, adminUser)

    expect(mockCacheService.get).toHaveBeenCalledWith(
      `schedules:list:${CLINIC_ID}:all:all:all:1:20`,
    )
  })

  it('cache key includes activeOn when provided', async () => {
    mockSchedulesRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute({ page: 1, limit: 20, activeOn: '2024-06-15' }, doctorUser)

    expect(mockCacheService.get).toHaveBeenCalledWith(
      `schedules:list:${CLINIC_ID}:${professionalId}:all:2024-06-15:1:20`,
    )
  })

  it('returns paginated response with correct shape', async () => {
    const schedule = makeSchedule()
    mockSchedulesRepository.findAll.mockResolvedValue([[schedule as any], 1])

    const result = await useCase.execute({ page: 1, limit: 20 }, doctorUser)

    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.data[0]).not.toHaveProperty('version')
    expect(result.data[0]).not.toHaveProperty('deletedAt')
  })

  it('uses default page=1 and limit=20 when not provided in query', async () => {
    mockSchedulesRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute({} as ListSchedulesQueryDto, doctorUser)

    expect(mockCacheService.get).toHaveBeenCalledWith(
      `schedules:list:${CLINIC_ID}:${professionalId}:all:all:1:20`,
    )
  })

  it('continues on cache read failure', async () => {
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockSchedulesRepository.findAll.mockResolvedValue([[], 0])

    await expect(useCase.execute({ page: 1, limit: 20 }, doctorUser)).resolves.toBeDefined()
  })

  it('continues on cache write failure', async () => {
    mockSchedulesRepository.findAll.mockResolvedValue([[], 0])
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute({ page: 1, limit: 20 }, doctorUser)).resolves.toBeDefined()
  })

  it('returns empty professionalName when name query returns no rows', async () => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    }
    const emptyDataSource = { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as DataSource
    const useCaseWithEmptyNames = new ListSchedulesUseCase(
      emptyDataSource,
      mockSchedulesRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )
    const schedule = makeSchedule()
    mockSchedulesRepository.findAll.mockResolvedValue([[schedule as any], 1])

    const result = await useCaseWithEmptyNames.execute({ page: 1, limit: 20 }, doctorUser)

    expect(result.data[0].professionalName).toBe('')
  })
})
