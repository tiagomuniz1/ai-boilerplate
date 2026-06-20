import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource, QueryFailedError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { AppointmentStatus, DayOfWeek, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { DistributedLockService } from '../../../cache/distributed-lock.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { GetActiveSchedulesForDoctorUseCase } from '../../schedules/use-cases/get-active-schedules-for-doctor.use-case'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { CreateAppointmentUseCase } from '../use-cases/create-appointment.use-case'

const CLINIC_ID = 'clinic-uuid'
const doctorUserId = faker.string.uuid()
const doctorId = faker.string.uuid()
const specialtyId = faker.string.uuid()
const specialtyName = 'Cardiologia'
const makeDoctor = (overrides = {}) => ({
  id: doctorId,
  specialties: [{ id: specialtyId, name: specialtyName }],
  ...overrides,
})

const doctorUser: ICurrentUser = { id: doctorUserId, role: UserRole.DOCTOR, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

const tomorrow = new Date()
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
const tomorrowStr = tomorrow.toISOString().split('T')[0]

const utcDay = tomorrow.getUTCDay()
const dayOfWeekMap: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
}
const tomorrowDayOfWeek = dayOfWeekMap[utcDay]

const makeSchedule = (overrides = {}) => ({
  id: faker.string.uuid(),
  doctorId,
  dayOfWeek: tomorrowDayOfWeek,
  startTime: '08:00',
  endTime: '10:00',
  slotDurationInMinutes: 30,
  validFrom: null,
  validUntil: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const makeAppointment = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId: CLINIC_ID,
  doctorId,
  patientId: faker.string.uuid(),
  specialtyId,
  scheduleId: faker.string.uuid(),
  date: tomorrowStr,
  startTime: '08:00',
  endTime: '08:30',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByDoctorAndDate: jest.fn(),
  findActiveBySlot: jest.fn(),
  hasFutureByScheduleId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

const mockDoctorsRepository: jest.Mocked<IDoctorsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByCrmNumber: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockPatientsRepository: jest.Mocked<IPatientsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByDocumentNumber: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockGetActiveSchedules = {
  execute: jest.fn(),
} as unknown as jest.Mocked<GetActiveSchedulesForDoctorUseCase>

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPrefix: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const mockDistributedLockService = {
  runWithLock: jest.fn().mockImplementation((_key, _ttl, fn) => fn()),
} as unknown as jest.Mocked<DistributedLockService>

function makeMockDataSource(): DataSource {
  const builder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([{ fullName: 'Dr. Test' }]),
  }
  return {
    createQueryBuilder: jest.fn().mockReturnValue(builder),
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: { getRepository: jest.fn() },
    }),
  } as unknown as DataSource
}

describe('CreateAppointmentUseCase', () => {
  let useCase: CreateAppointmentUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateAppointmentUseCase(
      makeMockDataSource(),
      mockAppointmentsRepository,
      mockDoctorsRepository,
      mockPatientsRepository,
      mockGetActiveSchedules,
      mockCacheService,
      mockDistributedLockService,
    )

    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor() as any)
    mockDoctorsRepository.findById.mockResolvedValue(makeDoctor() as any)
    mockPatientsRepository.findById.mockResolvedValue({ id: faker.string.uuid() } as any)
    mockGetActiveSchedules.execute.mockResolvedValue([makeSchedule() as any])
    mockAppointmentsRepository.findActiveBySlot.mockResolvedValue(null)
    mockAppointmentsRepository.create.mockResolvedValue(makeAppointment() as any)
    mockCacheService.delByPrefix.mockResolvedValue(undefined)
    mockDistributedLockService.runWithLock.mockImplementation((_key: any, _ttl: any, fn: any) => fn())
  })

  describe('DOCTOR role', () => {
    it('creates appointment using own doctorId (ignores dto.doctorId)', async () => {
      await useCase.execute(
        { patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00', doctorId: faker.string.uuid() },
        doctorUser,
      )
      expect(mockDoctorsRepository.findByUserId).toHaveBeenCalledWith(doctorUserId, CLINIC_ID)
      expect(mockAppointmentsRepository.create).toHaveBeenCalled()
    })

    it('throws NotFoundException when doctor profile not found', async () => {
      mockDoctorsRepository.findByUserId.mockResolvedValue(null)
      await expect(
        useCase.execute({ patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00' }, doctorUser),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('ADMIN role', () => {
    it('creates appointment using dto.doctorId', async () => {
      await useCase.execute(
        { patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00', doctorId },
        adminUser,
      )
      expect(mockDoctorsRepository.findById).toHaveBeenCalledWith(doctorId, CLINIC_ID)
    })

    it('throws UnprocessableEntityException when doctorId not provided', async () => {
      await expect(
        useCase.execute({ patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00' }, adminUser),
      ).rejects.toThrow(UnprocessableEntityException)
    })

    it('throws NotFoundException when doctor not found', async () => {
      mockDoctorsRepository.findById.mockResolvedValue(null)
      await expect(
        useCase.execute({ patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00', doctorId }, adminUser),
      ).rejects.toThrow(NotFoundException)
    })
  })

  it('throws NotFoundException when patient not found', async () => {
    mockPatientsRepository.findById.mockResolvedValue(null)
    await expect(
      useCase.execute({ patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00' }, doctorUser),
    ).rejects.toThrow(NotFoundException)
  })

  it('throws UnprocessableEntityException when booking in the past', async () => {
    const past = new Date()
    past.setUTCDate(past.getUTCDate() - 1)
    const pastStr = past.toISOString().split('T')[0]
    await expect(
      useCase.execute({ patientId: faker.string.uuid(), date: pastStr, startTime: '08:00' }, doctorUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when slot not in schedule', async () => {
    await expect(
      useCase.execute({ patientId: faker.string.uuid(), date: tomorrowStr, startTime: '15:00' }, doctorUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when no active schedules for date', async () => {
    mockGetActiveSchedules.execute.mockResolvedValue([])
    await expect(
      useCase.execute({ patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00' }, doctorUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws ConflictException when slot already booked', async () => {
    mockAppointmentsRepository.findActiveBySlot.mockResolvedValue(makeAppointment() as any)
    await expect(
      useCase.execute({ patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00' }, doctorUser),
    ).rejects.toThrow(ConflictException)
  })

  it('creates appointment and returns dto with derived endTime and scheduleId', async () => {
    const schedule = makeSchedule()
    mockGetActiveSchedules.execute.mockResolvedValue([schedule as any])
    const created = makeAppointment({ startTime: '08:00', endTime: '08:30', scheduleId: schedule.id })
    mockAppointmentsRepository.create.mockResolvedValue(created as any)

    const result = await useCase.execute(
      { patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00' },
      doctorUser,
    )

    expect(result.startTime).toBe('08:00')
    expect(result.endTime).toBe('08:30')
    expect(result.scheduleId).toBe(schedule.id)
    expect(result.status).toBe(AppointmentStatus.SCHEDULED)
  })

  it('invalidates cache after successful creation', async () => {
    await useCase.execute(
      { patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00' },
      doctorUser,
    )
    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`appointments:list:${CLINIC_ID}:`)
    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`appointments:availability:${CLINIC_ID}:${doctorId}:`)
  })

  it('continues when cache invalidation fails', async () => {
    mockCacheService.delByPrefix.mockRejectedValue(new Error('Redis error'))
    await expect(
      useCase.execute({ patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00' }, doctorUser),
    ).resolves.toBeDefined()
  })

  it('throws ConflictException when DB unique constraint violation occurs (code 23505)', async () => {
    const pgError = Object.assign(
      new QueryFailedError('INSERT ...', [], new Error('duplicate key')),
      { code: '23505' },
    )
    mockDistributedLockService.runWithLock.mockRejectedValue(pgError)

    await expect(
      useCase.execute({ patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00', doctorId }, adminUser),
    ).rejects.toThrow(ConflictException)
  })

  it('rethrows QueryFailedError with non-23505 code', async () => {
    const pgError = Object.assign(
      new QueryFailedError('INSERT ...', [], new Error('other db error')),
      { code: '23502' },
    )
    mockDistributedLockService.runWithLock.mockRejectedValue(pgError)

    await expect(
      useCase.execute({ patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00', doctorId }, adminUser),
    ).rejects.toThrow(QueryFailedError)
  })

  it('returns empty strings for doctorName and patientName when rows are empty', async () => {
    const emptyBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    }
    const emptyDataSource = {
      createQueryBuilder: jest.fn().mockReturnValue(emptyBuilder),
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: { getRepository: jest.fn() },
      }),
    } as unknown as DataSource

    const useCaseEmpty = new CreateAppointmentUseCase(
      emptyDataSource,
      mockAppointmentsRepository,
      mockDoctorsRepository,
      mockPatientsRepository,
      mockGetActiveSchedules,
      mockCacheService,
      mockDistributedLockService,
    )

    const result = await useCaseEmpty.execute(
      { patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00' },
      doctorUser,
    )

    expect(result.doctorName).toBe('')
    expect(result.patientName).toBe('')
  })

  describe('specialty resolution', () => {
    it('auto-resolves the only specialty when specialtyId is omitted', async () => {
      const result = await useCase.execute(
        { patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00' },
        doctorUser,
      )

      expect(result.specialtyId).toBe(specialtyId)
      expect(result.specialtyName).toBe(specialtyName)
      const createArg = mockAppointmentsRepository.create.mock.calls[0][0]
      expect(createArg.specialtyId).toBe(specialtyId)
    })

    it('uses the provided specialtyId when it belongs to the doctor', async () => {
      const second = { id: faker.string.uuid(), name: 'Neurologia' }
      mockDoctorsRepository.findByUserId.mockResolvedValue(
        makeDoctor({ specialties: [{ id: specialtyId, name: specialtyName }, second] }) as any,
      )
      mockAppointmentsRepository.create.mockResolvedValue(
        makeAppointment({ specialtyId: second.id }) as any,
      )

      const result = await useCase.execute(
        { patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00', specialtyId: second.id },
        doctorUser,
      )

      expect(result.specialtyId).toBe(second.id)
      expect(result.specialtyName).toBe('Neurologia')
    })

    it('throws 422 when specialtyId is omitted and the doctor has multiple specialties', async () => {
      mockDoctorsRepository.findByUserId.mockResolvedValue(
        makeDoctor({
          specialties: [
            { id: specialtyId, name: specialtyName },
            { id: faker.string.uuid(), name: 'Neurologia' },
          ],
        }) as any,
      )

      await expect(
        useCase.execute({ patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00' }, doctorUser),
      ).rejects.toThrow(UnprocessableEntityException)
      expect(mockAppointmentsRepository.create).not.toHaveBeenCalled()
    })

    it('throws 422 when the provided specialtyId does not belong to the doctor', async () => {
      await expect(
        useCase.execute(
          { patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00', specialtyId: faker.string.uuid() },
          doctorUser,
        ),
      ).rejects.toThrow(UnprocessableEntityException)
      expect(mockAppointmentsRepository.create).not.toHaveBeenCalled()
    })

    it('throws 422 when the doctor has no active specialty', async () => {
      mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor({ specialties: [] }) as any)

      await expect(
        useCase.execute({ patientId: faker.string.uuid(), date: tomorrowStr, startTime: '08:00' }, doctorUser),
      ).rejects.toThrow(UnprocessableEntityException)
      expect(mockAppointmentsRepository.create).not.toHaveBeenCalled()
    })
  })
})
