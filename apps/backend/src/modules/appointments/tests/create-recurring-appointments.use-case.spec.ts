import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource, QueryFailedError } from 'typeorm'
import { faker } from '@faker-js/faker'
import {
  AppointmentStatus,
  DayOfWeek,
  RecurrenceInterval,
  RecurringOccurrenceAvailability,
  UserRole,
} from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { DistributedLockService } from '../../../cache/distributed-lock.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { IAppointmentSeriesRepository } from '../repositories/appointment-series.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { CreateRecurringAppointmentsUseCase } from '../use-cases/create-recurring-appointments.use-case'
import { ResolveProfessionalSlotUseCase } from '../use-cases/resolve-professional-slot.use-case'

const CLINIC_ID = 'clinic-uuid'
const doctorUserId = faker.string.uuid()
const professionalId = faker.string.uuid()
const patientId = faker.string.uuid()
const specialtyId = faker.string.uuid()
const seriesId = faker.string.uuid()

// Tuesdays far enough ahead that "now" never reaches them.
const DATES = ['2099-06-16', '2099-06-23', '2099-06-30']
const START_TIME = '09:00'

const doctorUser: ICurrentUser = { id: doctorUserId, role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

const makeProfessional = (specialties = [{ id: specialtyId, name: 'Fisioterapia' }]) => ({
  id: professionalId,
  professionalSpecialties: specialties.map((s) => ({ specialtyId: s.id, specialty: { id: s.id, name: s.name } })),
})

const makeDto = (overrides = {}) => ({
  professionalId,
  patientId,
  startTime: START_TIME,
  recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
  dates: [...DATES],
  occurrenceCount: 3,
  ...overrides,
})

const makeAppointment = (date: string, sequence: number) => ({
  id: faker.string.uuid(),
  clinicId: CLINIC_ID,
  professionalId,
  patientId,
  specialtyId,
  scheduleId: faker.string.uuid(),
  date,
  startTime: START_TIME,
  endTime: '09:30',
  status: AppointmentStatus.SCHEDULED,
  insuranceType: null,
  reason: null,
  cancellationReason: null,
  seriesId,
  seriesSequence: sequence,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
})

const availableResolution = () => ({
  availability: RecurringOccurrenceAvailability.AVAILABLE,
  scheduleId: faker.string.uuid(),
  endTime: '09:30',
})

const mockAppointmentsRepository = {
  findActiveByDatesAndTime: jest.fn(),
  create: jest.fn(),
} as unknown as jest.Mocked<IAppointmentsRepository>

const mockSeriesRepository = {
  create: jest.fn(),
  findById: jest.fn(),
} as unknown as jest.Mocked<IAppointmentSeriesRepository>

const mockProfessionalsRepository = {
  findById: jest.fn(),
  findByUserId: jest.fn(),
} as unknown as jest.Mocked<IProfessionalsRepository>

const mockPatientsRepository = {
  findById: jest.fn(),
} as unknown as jest.Mocked<IPatientsRepository>

const mockResolveSlot = {
  executeDetailed: jest.fn(),
} as unknown as jest.Mocked<ResolveProfessionalSlotUseCase>

const mockCacheService = {
  delByPrefix: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const mockDistributedLockService = {
  runWithLock: jest.fn().mockImplementation((_key, _ttl, fn) => fn()),
} as unknown as jest.Mocked<DistributedLockService>

function makeMockDataSource(): DataSource {
  const builder = {
    select: jest.fn().mockReturnThis(),
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

describe('CreateRecurringAppointmentsUseCase', () => {
  let useCase: CreateRecurringAppointmentsUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateRecurringAppointmentsUseCase(
      makeMockDataSource(),
      mockAppointmentsRepository,
      mockSeriesRepository,
      mockProfessionalsRepository,
      mockPatientsRepository,
      mockResolveSlot,
      mockCacheService,
      mockDistributedLockService,
    )
    mockDistributedLockService.runWithLock.mockImplementation((_key: any, _ttl: any, fn: any) => fn())
    mockProfessionalsRepository.findById.mockResolvedValue(makeProfessional() as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeProfessional() as any)
    mockPatientsRepository.findById.mockResolvedValue({ id: patientId } as any)
    mockResolveSlot.executeDetailed.mockResolvedValue(availableResolution() as any)
    mockAppointmentsRepository.findActiveByDatesAndTime.mockResolvedValue([])
    mockSeriesRepository.create.mockResolvedValue({
      id: seriesId,
      dayOfWeek: DayOfWeek.TUESDAY,
      createdOccurrenceCount: DATES.length,
    } as any)
    let sequence = 0
    mockAppointmentsRepository.create.mockImplementation(async (data: any) => {
      sequence += 1
      return makeAppointment(data.date, sequence) as any
    })
    mockCacheService.delByPrefix.mockResolvedValue(undefined as any)
  })

  describe('access control and lookups', () => {
    it('throws 422 when an admin omits professionalId', async () => {
      await expect(
        useCase.execute(makeDto({ professionalId: undefined }) as any, adminUser),
      ).rejects.toThrow(UnprocessableEntityException)
    })

    it('throws 404 when the professional does not exist', async () => {
      mockProfessionalsRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute(makeDto() as any, adminUser)).rejects.toThrow(NotFoundException)
    })

    it('uses the current professional profile and ignores the body for a PROFESSIONAL', async () => {
      await useCase.execute(makeDto({ professionalId: faker.string.uuid() }) as any, doctorUser)

      expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(doctorUserId, CLINIC_ID)
      expect(mockProfessionalsRepository.findById).not.toHaveBeenCalled()
    })

    it('throws 404 when the patient does not exist', async () => {
      mockPatientsRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute(makeDto() as any, adminUser)).rejects.toThrow(NotFoundException)
    })
  })

  describe('specialty resolution', () => {
    it('resolves the single specialty automatically', async () => {
      await useCase.execute(makeDto() as any, adminUser)

      expect(mockSeriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ specialtyId }),
        expect.anything(),
      )
    })

    it('stores a null specialty for a generalist professional', async () => {
      mockProfessionalsRepository.findById.mockResolvedValue(makeProfessional([]) as any)

      await useCase.execute(makeDto() as any, adminUser)

      expect(mockSeriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ specialtyId: null }),
        expect.anything(),
      )
    })

    it('throws 422 when the professional has several specialties and none was chosen', async () => {
      mockProfessionalsRepository.findById.mockResolvedValue(
        makeProfessional([
          { id: specialtyId, name: 'Fisioterapia' },
          { id: faker.string.uuid(), name: 'Nutrição' },
        ]) as any,
      )

      await expect(useCase.execute(makeDto() as any, adminUser)).rejects.toThrow(
        UnprocessableEntityException,
      )
    })

    it('throws 422 when the chosen specialty belongs to another professional', async () => {
      await expect(
        useCase.execute(makeDto({ specialtyId: faker.string.uuid() }) as any, adminUser),
      ).rejects.toThrow(UnprocessableEntityException)
    })
  })

  describe('recurrence grid guard', () => {
    it('rejects dates on different weekdays', async () => {
      await expect(
        useCase.execute(makeDto({ dates: ['2099-06-16', '2099-06-24'] }) as any, adminUser),
      ).rejects.toThrow('All dates must fall on the same weekday')
    })

    it('rejects dates that are not on the requested interval grid', async () => {
      await expect(
        useCase.execute(
          makeDto({
            recurrenceInterval: RecurrenceInterval.EVERY_TWO_WEEKS,
            dates: ['2099-06-16', '2099-06-23'],
          }) as any,
          adminUser,
        ),
      ).rejects.toThrow('Dates do not match the requested recurrence interval')
    })

    it('rejects a series spanning more than the allowed horizon', async () => {
      await expect(
        useCase.execute(makeDto({ dates: ['2099-06-16', '2100-06-22'] }) as any, adminUser),
      ).rejects.toThrow('A series cannot span more than 365 days')
    })

    it('rejects a series containing a past date', async () => {
      await expect(
        useCase.execute(makeDto({ dates: ['2020-06-16', '2020-06-23'] }) as any, adminUser),
      ).rejects.toThrow('Cannot book an appointment in the past')
    })

    it('accepts dates submitted out of order', async () => {
      const result = await useCase.execute(
        makeDto({ dates: ['2099-06-30', '2099-06-16', '2099-06-23'] }) as any,
        adminUser,
      )

      expect(result.appointments.map((a) => a.date)).toEqual(DATES)
      expect(mockSeriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ anchorDate: '2099-06-16' }),
        expect.anything(),
      )
    })
  })

  describe('happy path', () => {
    it('creates the series and every occurrence with an ascending sequence', async () => {
      const result = await useCase.execute(makeDto() as any, adminUser)

      expect(mockSeriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: CLINIC_ID,
          professionalId,
          patientId,
          recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
          dayOfWeek: DayOfWeek.TUESDAY,
          startTime: START_TIME,
          anchorDate: '2099-06-16',
          requestedOccurrenceCount: 3,
          requestedUntilDate: null,
          createdOccurrenceCount: 3,
          createdByUserId: adminUser.id,
        }),
        expect.anything(),
      )
      expect(mockAppointmentsRepository.create).toHaveBeenCalledTimes(3)
      expect(
        (mockAppointmentsRepository.create as jest.Mock).mock.calls.map(([data]) => [
          data.date,
          data.seriesSequence,
          data.seriesId,
        ]),
      ).toEqual([
        ['2099-06-16', 1, seriesId],
        ['2099-06-23', 2, seriesId],
        ['2099-06-30', 3, seriesId],
      ])
      expect(result.seriesId).toBe(seriesId)
      expect(result.createdOccurrenceCount).toBe(3)
      expect(result.appointments).toHaveLength(3)
      expect(result.appointments[0].seriesTotalOccurrences).toBe(3)
      expect(result.appointments[0].professionalName).toBe('Dr. Test')
    })

    it('stores untilDate when the series was bounded by a date', async () => {
      await useCase.execute(
        makeDto({ occurrenceCount: undefined, untilDate: '2099-07-01' }) as any,
        adminUser,
      )

      expect(mockSeriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ requestedOccurrenceCount: null, requestedUntilDate: '2099-07-01' }),
        expect.anything(),
      )
    })

    it('takes a single series-wide lock rather than one per slot', async () => {
      await useCase.execute(makeDto() as any, adminUser)

      expect(mockDistributedLockService.runWithLock).toHaveBeenCalledTimes(1)
      expect(mockDistributedLockService.runWithLock).toHaveBeenCalledWith(
        `appointment:series:${CLINIC_ID}:${professionalId}`,
        20,
        expect.any(Function),
      )
    })

    it('invalidates list, availability and dashboard caches', async () => {
      await useCase.execute(makeDto() as any, adminUser)

      expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`appointments:list:${CLINIC_ID}:`)
      expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(
        `appointments:availability:${CLINIC_ID}:${professionalId}:`,
      )
      expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`dashboard:${CLINIC_ID}:`)
    })

    it('still returns the series when cache invalidation fails', async () => {
      mockCacheService.delByPrefix.mockRejectedValue(new Error('redis down'))

      const result = await useCase.execute(makeDto() as any, adminUser)

      expect(result.createdOccurrenceCount).toBe(3)
    })

    it('returns empty names when the lookup queries find no rows', async () => {
      const builder = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }
      const dataSource = {
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

      const useCaseWithoutNames = new CreateRecurringAppointmentsUseCase(
        dataSource,
        mockAppointmentsRepository,
        mockSeriesRepository,
        mockProfessionalsRepository,
        mockPatientsRepository,
        mockResolveSlot,
        mockCacheService,
        mockDistributedLockService,
      )

      const result = await useCaseWithoutNames.execute(makeDto() as any, adminUser)

      expect(result.appointments[0].professionalName).toBe('')
      expect(result.appointments[0].patientName).toBe('')
    })
  })

  describe('when something changed between the preview and the submit', () => {
    it('throws 409 listing every unavailable date found before the lock', async () => {
      mockResolveSlot.executeDetailed
        .mockResolvedValueOnce(availableResolution() as any)
        .mockResolvedValueOnce({
          availability: RecurringOccurrenceAvailability.ALREADY_BOOKED,
          scheduleId: null,
          endTime: null,
        } as any)
        .mockResolvedValueOnce({
          availability: RecurringOccurrenceAvailability.BLOCKED_BY_EXCEPTION,
          scheduleId: null,
          endTime: null,
        } as any)

      const error = await useCase.execute(makeDto() as any, adminUser).catch((e) => e)

      expect(error).toBeInstanceOf(ConflictException)
      expect((error.getResponse() as any).conflictingOccurrences).toEqual([
        expect.objectContaining({
          date: '2099-06-23',
          availability: RecurringOccurrenceAvailability.ALREADY_BOOKED,
          selectable: false,
        }),
        expect.objectContaining({
          date: '2099-06-30',
          availability: RecurringOccurrenceAvailability.BLOCKED_BY_EXCEPTION,
        }),
      ])
      expect(mockSeriesRepository.create).not.toHaveBeenCalled()
    })

    it('throws 409 and creates nothing when a slot is taken inside the transaction', async () => {
      mockAppointmentsRepository.findActiveByDatesAndTime.mockResolvedValue([
        { date: '2099-06-23' },
      ] as any)

      const error = await useCase.execute(makeDto() as any, adminUser).catch((e) => e)

      expect(error).toBeInstanceOf(ConflictException)
      expect((error.getResponse() as any).conflictingOccurrences).toEqual([
        expect.objectContaining({ date: '2099-06-23' }),
      ])
      expect(mockSeriesRepository.create).not.toHaveBeenCalled()
      expect(mockAppointmentsRepository.create).not.toHaveBeenCalled()
    })

    it('converts a unique-violation into a 409 with the dates that are now taken', async () => {
      const uniqueViolation = Object.assign(new QueryFailedError('q', [], new Error('duplicate')), {
        code: '23505',
      })
      mockAppointmentsRepository.create.mockRejectedValue(uniqueViolation)
      mockAppointmentsRepository.findActiveByDatesAndTime
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ date: '2099-06-16' }] as any)

      const error = await useCase.execute(makeDto() as any, adminUser).catch((e) => e)

      expect(error).toBeInstanceOf(ConflictException)
      expect((error.getResponse() as any).conflictingOccurrences).toEqual([
        expect.objectContaining({ date: '2099-06-16' }),
      ])
    })

    it('rethrows a query failure that is not a unique violation', async () => {
      const failure = Object.assign(new QueryFailedError('q', [], new Error('boom')), { code: '42601' })
      mockAppointmentsRepository.create.mockRejectedValue(failure)

      await expect(useCase.execute(makeDto() as any, adminUser)).rejects.toThrow(QueryFailedError)
    })

    it('propagates the conflict raised when the series lock is already held', async () => {
      mockDistributedLockService.runWithLock.mockRejectedValue(
        new ConflictException('Resource is temporarily locked. Please try again.'),
      )

      await expect(useCase.execute(makeDto() as any, adminUser)).rejects.toThrow(ConflictException)
    })
  })
})
