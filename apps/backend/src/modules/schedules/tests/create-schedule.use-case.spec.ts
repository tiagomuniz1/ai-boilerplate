import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { DayOfWeek, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ISchedulesRepository } from '../repositories/schedules.repository.interface'
import { CreateScheduleUseCase } from '../use-cases/create-schedule.use-case'

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

const makeDoctor = () => ({ id: faker.string.uuid() } as any)

const makeSchedule = (overrides = {}) => ({
  id: faker.string.uuid(),
  professionalId: faker.string.uuid(),
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

const makeDto = (overrides = {}) => ({
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
  ...overrides,
})

const CLINIC_ID = 'fixed-clinic-uuid'
const doctorUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

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

describe('CreateScheduleUseCase', () => {
  let useCase: CreateScheduleUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateScheduleUseCase(
      makeMockDataSource(),
      mockSchedulesRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )
    mockCacheService.delByPrefix.mockResolvedValue(undefined)
  })

  it('creates schedule as doctor using findByUserId (ignores dto.professionalId)', async () => {
    const doctor = makeDoctor()
    const schedule = makeSchedule({ professionalId: doctor.id })
    mockProfessionalsRepository.findByUserId.mockResolvedValue(doctor)
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.create.mockResolvedValue(schedule as any)

    const result = await useCase.execute(
      makeDto({ professionalId: faker.string.uuid() }),
      doctorUser,
    )

    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, CLINIC_ID)
    expect(mockProfessionalsRepository.findById).not.toHaveBeenCalled()
    expect(result.id).toBeDefined()
  })

  it('creates schedule as admin using dto.professionalId', async () => {
    const targetDoctorId = faker.string.uuid()
    const dto = makeDto({ professionalId: targetDoctorId })
    const schedule = makeSchedule({ professionalId: targetDoctorId })
    mockProfessionalsRepository.findById.mockResolvedValue({ id: targetDoctorId } as any)
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.create.mockResolvedValue(schedule as any)

    await useCase.execute(dto, adminUser)

    expect(mockProfessionalsRepository.findById).toHaveBeenCalledWith(targetDoctorId, CLINIC_ID)
  })

  it('throws ForbiddenException when role is USER', async () => {
    const userUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.USER, clinicId: faker.string.uuid() }
    await expect(useCase.execute(makeDto(), userUser)).rejects.toThrow(ForbiddenException)
    expect(mockSchedulesRepository.create).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when role is PATIENT', async () => {
    const patientUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.PATIENT, clinicId: faker.string.uuid() }
    await expect(useCase.execute(makeDto(), patientUser)).rejects.toThrow(ForbiddenException)
    expect(mockSchedulesRepository.create).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when admin omits professionalId', async () => {
    await expect(useCase.execute(makeDto(), adminUser)).rejects.toThrow(
      UnprocessableEntityException,
    )
    expect(mockSchedulesRepository.create).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when doctor does not exist', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    await expect(useCase.execute(makeDto(), doctorUser)).rejects.toThrow(NotFoundException)
    expect(mockSchedulesRepository.create).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when startTime >= endTime', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor())
    await expect(
      useCase.execute(makeDto({ startTime: '12:00', endTime: '08:00' }), doctorUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when interval not divisible by slot', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor())
    await expect(
      useCase.execute(makeDto({ startTime: '08:00', endTime: '09:00', slotDurationInMinutes: 40 }), doctorUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when validFrom >= validUntil', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor())
    await expect(
      useCase.execute(makeDto({ validFrom: '2025-06-01', validUntil: '2025-01-01' }), doctorUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when validFrom equals validUntil', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor())
    await expect(
      useCase.execute(makeDto({ validFrom: '2025-01-01', validUntil: '2025-01-01' }), doctorUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('succeeds with only validFrom (open-ended validity)', async () => {
    const schedule = makeSchedule()
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.create.mockResolvedValue(schedule as any)

    const result = await useCase.execute(makeDto({ validFrom: '2025-01-01' }), doctorUser)

    expect(result.id).toBeDefined()
  })

  it('throws ConflictException when schedule overlaps', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockSchedulesRepository.findOverlapping.mockResolvedValue(makeSchedule() as any)

    await expect(useCase.execute(makeDto(), doctorUser)).rejects.toThrow(ConflictException)
    expect(mockSchedulesRepository.create).not.toHaveBeenCalled()
  })

  it('invalidates cache after creation using doctor profile id', async () => {
    const doctor = makeDoctor()
    const schedule = makeSchedule({ professionalId: doctor.id })
    mockProfessionalsRepository.findByUserId.mockResolvedValue(doctor)
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.create.mockResolvedValue(schedule as any)

    await useCase.execute(makeDto(), doctorUser)

    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`schedules:list:${CLINIC_ID}:`)
  })

  it('continues when cache invalidation fails', async () => {
    const schedule = makeSchedule()
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.create.mockResolvedValue(schedule as any)
    mockCacheService.delByPrefix.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(makeDto(), doctorUser)

    expect(result.id).toBeDefined()
  })

  it('response does not contain version or deletedAt', async () => {
    const schedule = makeSchedule()
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.create.mockResolvedValue(schedule as any)

    const result = await useCase.execute(makeDto(), doctorUser)

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
    const useCaseWithEmptyNames = new CreateScheduleUseCase(
      emptyDataSource,
      mockSchedulesRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )
    const schedule = makeSchedule()
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.create.mockResolvedValue(schedule as any)

    const result = await useCaseWithEmptyNames.execute(makeDto(), doctorUser)

    expect(result.professionalName).toBe('')
  })
})
