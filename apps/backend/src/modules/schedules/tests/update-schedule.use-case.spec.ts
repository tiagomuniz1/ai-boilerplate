import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { DayOfWeek, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.adapter'
import { ISchedulesRepository } from '../repositories/schedules.repository.interface'
import { UpdateScheduleUseCase } from '../use-cases/update-schedule.use-case'

const mockSchedulesRepository: jest.Mocked<ISchedulesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findOverlapping: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deleteAllByDoctorId: jest.fn(),
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

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  hasFutureAppointmentsByScheduleId: jest.fn(),
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
const ownerId = faker.string.uuid()
const otherDoctorId = faker.string.uuid()
const adminId = faker.string.uuid()

const ownerUser: ICurrentUser = { id: ownerId, role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
const otherDoctorUser: ICurrentUser = { id: otherDoctorId, role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: adminId, role: UserRole.ADMIN, clinicId: CLINIC_ID }

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

describe('UpdateScheduleUseCase', () => {
  let useCase: UpdateScheduleUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdateScheduleUseCase(
      makeMockDataSource(),
      mockSchedulesRepository,
      mockProfessionalsRepository,
      mockAppointmentsRepository,
      mockCacheService,
    )
    mockAppointmentsRepository.hasFutureAppointmentsByScheduleId.mockResolvedValue(false)
    mockCacheService.delByPrefix.mockResolvedValue(undefined)
    mockProfessionalsRepository.findByUserId.mockImplementation((userId: string) =>
      Promise.resolve({ id: userId } as any),
    )
  })

  it('throws NotFoundException when schedule not found', async () => {
    mockSchedulesRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute(faker.string.uuid(), {}, ownerUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when role is USER', async () => {
    mockSchedulesRepository.findById.mockResolvedValue(makeSchedule() as any)
    const userUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.USER, clinicId: faker.string.uuid() }
    await expect(useCase.execute(faker.string.uuid(), {}, userUser)).rejects.toThrow(ForbiddenException)
    expect(mockSchedulesRepository.update).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when role is PATIENT', async () => {
    mockSchedulesRepository.findById.mockResolvedValue(makeSchedule() as any)
    const patientUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.PATIENT, clinicId: faker.string.uuid() }
    await expect(useCase.execute(faker.string.uuid(), {}, patientUser)).rejects.toThrow(ForbiddenException)
    expect(mockSchedulesRepository.update).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when DOCTOR has no profile', async () => {
    mockSchedulesRepository.findById.mockResolvedValue(makeSchedule() as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    await expect(useCase.execute(faker.string.uuid(), {}, ownerUser)).rejects.toThrow(NotFoundException)
    expect(mockSchedulesRepository.update).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when doctor tries to update another doctor schedule', async () => {
    mockSchedulesRepository.findById.mockResolvedValue(makeSchedule() as any)
    await expect(useCase.execute(faker.string.uuid(), {}, otherDoctorUser)).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('allows admin to update any schedule', async () => {
    const schedule = makeSchedule()
    const updated = makeSchedule({ specialty: 'X' })
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.update.mockResolvedValue(updated as any)

    await expect(useCase.execute(schedule.id, { startTime: '09:00' }, adminUser)).resolves.toBeDefined()
  })

  it('throws ConflictException when schedule has future appointments', async () => {
    mockSchedulesRepository.findById.mockResolvedValue(makeSchedule() as any)
    mockAppointmentsRepository.hasFutureAppointmentsByScheduleId.mockResolvedValue(true)

    await expect(useCase.execute(faker.string.uuid(), {}, ownerUser)).rejects.toThrow(ConflictException)
    expect(mockSchedulesRepository.update).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when merged startTime >= endTime', async () => {
    mockSchedulesRepository.findById.mockResolvedValue(makeSchedule() as any)

    await expect(
      useCase.execute(faker.string.uuid(), { startTime: '14:00' }, ownerUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when interval not divisible by merged slot', async () => {
    mockSchedulesRepository.findById.mockResolvedValue(makeSchedule() as any)

    await expect(
      useCase.execute(faker.string.uuid(), { slotDurationInMinutes: 70 }, ownerUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when merged validFrom >= validUntil', async () => {
    const schedule = makeSchedule({ validUntil: '2025-03-01' })
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)

    await expect(
      useCase.execute(faker.string.uuid(), { validFrom: '2025-06-01' }, ownerUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('does not trigger overlap check when only slotDurationInMinutes changes', async () => {
    const schedule = makeSchedule()
    const updated = makeSchedule({ slotDurationInMinutes: 60 })
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)
    mockSchedulesRepository.update.mockResolvedValue(updated as any)

    await useCase.execute(schedule.id, { slotDurationInMinutes: 60 }, ownerUser)

    expect(mockSchedulesRepository.findOverlapping).not.toHaveBeenCalled()
  })

  it('triggers overlap check when startTime changes', async () => {
    const schedule = makeSchedule()
    const updated = makeSchedule()
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.update.mockResolvedValue(updated as any)

    await useCase.execute(schedule.id, { startTime: '09:00' }, ownerUser)

    expect(mockSchedulesRepository.findOverlapping).toHaveBeenCalledWith(
      schedule.professionalId,
      schedule.dayOfWeek,
      '09:00',
      schedule.endTime,
      schedule.validFrom,
      schedule.validUntil,
      CLINIC_ID,
      schedule.id,
    )
  })

  it('throws ConflictException when updated time overlaps another schedule', async () => {
    const schedule = makeSchedule()
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)
    mockSchedulesRepository.findOverlapping.mockResolvedValue(makeSchedule() as any)

    await expect(
      useCase.execute(schedule.id, { startTime: '07:00' }, ownerUser),
    ).rejects.toThrow(ConflictException)
    expect(mockSchedulesRepository.update).not.toHaveBeenCalled()
  })

  it('removes validUntil when null is sent (undefined != null)', async () => {
    const schedule = makeSchedule({ validUntil: '2025-12-31' })
    const updated = makeSchedule({ validUntil: null })
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.update.mockResolvedValue(updated as any)

    await useCase.execute(schedule.id, { validUntil: null }, ownerUser)

    expect(mockSchedulesRepository.update).toHaveBeenCalledWith(
      schedule.id,
      { validUntil: null },
    )
  })

  it('preserves existing validFrom when dto.validFrom is undefined', async () => {
    const schedule = makeSchedule({ validFrom: '2025-01-01' })
    const updated = makeSchedule({ validFrom: '2025-01-01' })
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)
    mockSchedulesRepository.update.mockResolvedValue(updated as any)

    await useCase.execute(schedule.id, { slotDurationInMinutes: 60 }, ownerUser)

    expect(mockSchedulesRepository.findOverlapping).not.toHaveBeenCalled()
  })

  it('throws ConflictException on optimistic lock mismatch', async () => {
    const schedule = makeSchedule()
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)
    mockSchedulesRepository.update.mockRejectedValue(new OptimisticLockVersionMismatchError('', 1, 2))

    await expect(
      useCase.execute(schedule.id, { slotDurationInMinutes: 60 }, ownerUser),
    ).rejects.toThrow(ConflictException)
  })

  it('uses provided dayOfWeek in merged values and triggers overlap check', async () => {
    const schedule = makeSchedule()
    const updated = makeSchedule({ dayOfWeek: DayOfWeek.TUESDAY })
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.update.mockResolvedValue(updated as any)

    await expect(
      useCase.execute(schedule.id, { dayOfWeek: DayOfWeek.TUESDAY }, ownerUser),
    ).resolves.toBeDefined()

    expect(mockSchedulesRepository.findOverlapping).toHaveBeenCalledWith(
      schedule.professionalId,
      DayOfWeek.TUESDAY,
      schedule.startTime,
      schedule.endTime,
      schedule.validFrom,
      schedule.validUntil,
      CLINIC_ID,
      schedule.id,
    )
  })

  it('uses provided endTime in merged values and triggers overlap check', async () => {
    const schedule = makeSchedule()
    const updated = makeSchedule({ endTime: '13:00' })
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.update.mockResolvedValue(updated as any)

    await expect(
      useCase.execute(schedule.id, { endTime: '13:00' }, ownerUser),
    ).resolves.toBeDefined()

    expect(mockSchedulesRepository.findOverlapping).toHaveBeenCalledWith(
      schedule.professionalId,
      schedule.dayOfWeek,
      schedule.startTime,
      '13:00',
      schedule.validFrom,
      schedule.validUntil,
      CLINIC_ID,
      schedule.id,
    )
  })

  it('propagates non-optimistic-lock errors from repository update', async () => {
    const schedule = makeSchedule()
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)
    mockSchedulesRepository.update.mockRejectedValue(new Error('Database connection lost'))

    await expect(
      useCase.execute(schedule.id, { slotDurationInMinutes: 60 }, ownerUser),
    ).rejects.toThrow('Database connection lost')
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
    const useCaseWithEmptyNames = new UpdateScheduleUseCase(
      emptyDataSource,
      mockSchedulesRepository,
      mockProfessionalsRepository,
      mockAppointmentsRepository,
      mockCacheService,
    )
    const schedule = makeSchedule()
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)
    mockSchedulesRepository.update.mockResolvedValue(schedule as any)

    const result = await useCaseWithEmptyNames.execute(
      schedule.id,
      { slotDurationInMinutes: 60 },
      ownerUser,
    )

    expect(result.professionalName).toBe('')
  })

  it('invalidates cache after update using schedule.professionalId', async () => {
    const schedule = makeSchedule()
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)
    mockSchedulesRepository.update.mockResolvedValue(schedule as any)

    await useCase.execute(schedule.id, { slotDurationInMinutes: 60 }, ownerUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`schedule:${CLINIC_ID}:${schedule.id}`)
    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`schedules:list:${CLINIC_ID}:`)
  })

  it('continues when cache invalidation fails', async () => {
    const schedule = makeSchedule()
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)
    mockSchedulesRepository.update.mockResolvedValue(schedule as any)
    mockCacheService.delByPrefix.mockRejectedValue(new Error('Redis error'))

    await expect(
      useCase.execute(schedule.id, { slotDurationInMinutes: 60 }, ownerUser),
    ).resolves.toBeDefined()
  })
})
