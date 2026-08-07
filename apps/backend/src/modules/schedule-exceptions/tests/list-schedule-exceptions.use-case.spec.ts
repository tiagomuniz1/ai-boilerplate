import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IScheduleExceptionsRepository } from '../repositories/schedule-exceptions.repository.interface'
import { ListScheduleExceptionsUseCase } from '../use-cases/list-schedule-exceptions.use-case'

const mockScheduleExceptionsRepository: jest.Mocked<IScheduleExceptionsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByProfessionalAndDate: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
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

const CLINIC_ID = 'clinic-uuid'
const DOCTOR_ID = 'doctor-uuid'

const makeDoctor = (id = DOCTOR_ID) => ({ id } as any)

const makeException = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId: CLINIC_ID,
  professionalId: DOCTOR_ID,
  date: '2099-06-20',
  startTime: null,
  endTime: null,
  reason: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const doctorUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

describe('ListScheduleExceptionsUseCase', () => {
  let useCase: ListScheduleExceptionsUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ListScheduleExceptionsUseCase(
      {} as DataSource,
      mockScheduleExceptionsRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
  })

  it('DOCTOR list is forced to own professionalId', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockScheduleExceptionsRepository.findAll.mockResolvedValue([[makeException() as any], 1])

    await useCase.execute({ professionalId: 'other-doctor-id' } as any, doctorUser)

    expect(mockScheduleExceptionsRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ professionalId: DOCTOR_ID }),
      CLINIC_ID,
    )
  })

  it('throws NotFoundException when DOCTOR has no doctor profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    await expect(useCase.execute({} as any, doctorUser)).rejects.toThrow(NotFoundException)
  })

  it('ADMIN can list all exceptions without professionalId filter', async () => {
    mockScheduleExceptionsRepository.findAll.mockResolvedValue([[makeException() as any], 1])

    const result = await useCase.execute({} as any, adminUser)

    expect(mockScheduleExceptionsRepository.findAll).toHaveBeenCalledWith(
      expect.not.objectContaining({ professionalId: expect.any(String) }),
      CLINIC_ID,
    )
    expect(result.total).toBe(1)
  })

  it('returns cached result on cache hit', async () => {
    const cached = { data: [], total: 0, page: 1, limit: 20 }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute({} as any, adminUser)

    expect(result).toBe(cached)
    expect(mockScheduleExceptionsRepository.findAll).not.toHaveBeenCalled()
  })

  it('saves result to cache on cache miss', async () => {
    mockScheduleExceptionsRepository.findAll.mockResolvedValue([[makeException() as any], 1])

    await useCase.execute({} as any, adminUser)

    expect(mockCacheService.set).toHaveBeenCalledWith(
      expect.stringContaining('schedule-exceptions:list:'),
      expect.any(Object),
      60,
    )
  })

  it('continues when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockScheduleExceptionsRepository.findAll.mockResolvedValue([[makeException() as any], 1])

    const result = await useCase.execute({} as any, adminUser)
    expect(result.total).toBe(1)
  })

  it('filters by from/to date range when provided', async () => {
    mockScheduleExceptionsRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute({ from: '2099-06-01', to: '2099-06-30' } as any, adminUser)

    expect(mockScheduleExceptionsRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ from: '2099-06-01', to: '2099-06-30' }),
      CLINIC_ID,
    )
  })

  it('returns paginated response with correct shape', async () => {
    const exception = makeException()
    mockScheduleExceptionsRepository.findAll.mockResolvedValue([[exception as any], 1])

    const result = await useCase.execute({ page: 2, limit: 10 } as any, adminUser)

    expect(result).toMatchObject({ total: 1, page: 2, limit: 10 })
    expect(result.data[0]).toMatchObject({
      id: exception.id,
      professionalId: exception.professionalId,
      date: exception.date,
    })
  })

  it('continues when cache write fails', async () => {
    mockScheduleExceptionsRepository.findAll.mockResolvedValue([[makeException() as any], 1])
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute({} as any, adminUser)

    expect(result.total).toBe(1)
  })
})
