import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { RecurringOccurrenceAvailability } from '@app/shared'
import { GetActiveSchedulesForProfessionalUseCase } from '../../schedules/use-cases/get-active-schedules-for-professional.use-case'
import { GetActiveExceptionsForProfessionalUseCase } from '../../schedule-exceptions/use-cases/get-active-exceptions-for-professional.use-case'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { ResolveProfessionalSlotUseCase } from '../use-cases/resolve-professional-slot.use-case'

const CLINIC_ID = 'clinic-uuid'
const professionalId = faker.string.uuid()
const DATE = '2099-06-20'

const makeSchedule = (overrides = {}) => ({
  id: faker.string.uuid(),
  startTime: '08:00',
  endTime: '10:00',
  slotDurationInMinutes: 30,
  ...overrides,
})

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByProfessionalAndDate: jest.fn(),
  findActiveBySlot: jest.fn(),
  findActiveByDatesAndTime: jest.fn(),
  findBySeriesId: jest.fn(),
  findBySeriesIdFromDate: jest.fn(),
  countBySeriesIdAfterDate: jest.fn(),
  hasFutureByScheduleId: jest.fn(),
  hasFutureByProfessionalId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

const mockGetActiveSchedules = {
  execute: jest.fn(),
} as unknown as jest.Mocked<GetActiveSchedulesForProfessionalUseCase>

const mockGetActiveExceptions = {
  execute: jest.fn(),
} as unknown as jest.Mocked<GetActiveExceptionsForProfessionalUseCase>

describe('ResolveProfessionalSlotUseCase', () => {
  let useCase: ResolveProfessionalSlotUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ResolveProfessionalSlotUseCase(
      {} as DataSource,
      mockAppointmentsRepository,
      mockGetActiveSchedules,
      mockGetActiveExceptions,
    )
    mockGetActiveSchedules.execute.mockResolvedValue([makeSchedule() as any])
    mockGetActiveExceptions.execute.mockResolvedValue([])
    mockAppointmentsRepository.findActiveBySlot.mockResolvedValue(null)
  })

  it('returns the matched slot when the professional can host it', async () => {
    const schedule = makeSchedule()
    mockGetActiveSchedules.execute.mockResolvedValue([schedule as any])

    const result = await useCase.execute(professionalId, CLINIC_ID, DATE, '08:30')

    expect(result).toEqual({ scheduleId: schedule.id, endTime: '09:00' })
  })

  it('returns null when the professional has no schedule for the date', async () => {
    mockGetActiveSchedules.execute.mockResolvedValue([])
    expect(await useCase.execute(professionalId, CLINIC_ID, DATE, '08:00')).toBeNull()
  })

  it('returns null when the requested startTime is not on the slot grid', async () => {
    expect(await useCase.execute(professionalId, CLINIC_ID, DATE, '08:15')).toBeNull()
  })

  it('returns null when the slot is blocked by a schedule exception', async () => {
    mockGetActiveExceptions.execute.mockResolvedValue([{ startTime: null, endTime: null } as any])
    expect(await useCase.execute(professionalId, CLINIC_ID, DATE, '08:00')).toBeNull()
  })

  it('returns null when the slot is already booked', async () => {
    mockAppointmentsRepository.findActiveBySlot.mockResolvedValue({ id: faker.string.uuid() } as any)
    expect(await useCase.execute(professionalId, CLINIC_ID, DATE, '08:00')).toBeNull()
  })

  it('scans multiple schedules to find the matching slot', async () => {
    const morning = makeSchedule({ startTime: '08:00', endTime: '09:00' })
    const afternoon = makeSchedule({ startTime: '14:00', endTime: '15:00' })
    mockGetActiveSchedules.execute.mockResolvedValue([morning, afternoon] as any)

    const result = await useCase.execute(professionalId, CLINIC_ID, DATE, '14:00')

    expect(result).toEqual({ scheduleId: afternoon.id, endTime: '14:30' })
  })

  describe('executeDetailed', () => {
    it('reports AVAILABLE with the matched schedule and end time', async () => {
      const schedule = makeSchedule()
      mockGetActiveSchedules.execute.mockResolvedValue([schedule as any])

      const result = await useCase.executeDetailed(professionalId, CLINIC_ID, DATE, '08:30')

      expect(result).toEqual({
        availability: RecurringOccurrenceAvailability.AVAILABLE,
        scheduleId: schedule.id,
        endTime: '09:00',
      })
    })

    it('reports OUTSIDE_SCHEDULE when there is no schedule for the date', async () => {
      mockGetActiveSchedules.execute.mockResolvedValue([])

      const result = await useCase.executeDetailed(professionalId, CLINIC_ID, DATE, '08:00')

      expect(result).toEqual({
        availability: RecurringOccurrenceAvailability.OUTSIDE_SCHEDULE,
        scheduleId: null,
        endTime: null,
      })
      expect(mockGetActiveExceptions.execute).not.toHaveBeenCalled()
    })

    it('reports OUTSIDE_SCHEDULE when the startTime is off the slot grid', async () => {
      const result = await useCase.executeDetailed(professionalId, CLINIC_ID, DATE, '08:15')

      expect(result.availability).toBe(RecurringOccurrenceAvailability.OUTSIDE_SCHEDULE)
    })

    it('reports BLOCKED_BY_EXCEPTION for a full-day block', async () => {
      mockGetActiveExceptions.execute.mockResolvedValue([{ startTime: null, endTime: null } as any])

      const result = await useCase.executeDetailed(professionalId, CLINIC_ID, DATE, '08:00')

      expect(result).toEqual({
        availability: RecurringOccurrenceAvailability.BLOCKED_BY_EXCEPTION,
        scheduleId: null,
        endTime: null,
      })
      expect(mockAppointmentsRepository.findActiveBySlot).not.toHaveBeenCalled()
    })

    it('reports BLOCKED_BY_EXCEPTION for a partial block overlapping the slot', async () => {
      mockGetActiveExceptions.execute.mockResolvedValue([
        { startTime: '08:15', endTime: '08:45' } as any,
      ])

      const result = await useCase.executeDetailed(professionalId, CLINIC_ID, DATE, '08:00')

      expect(result.availability).toBe(RecurringOccurrenceAvailability.BLOCKED_BY_EXCEPTION)
    })

    it('reports ALREADY_BOOKED when the slot is taken', async () => {
      mockAppointmentsRepository.findActiveBySlot.mockResolvedValue({ id: faker.string.uuid() } as any)

      const result = await useCase.executeDetailed(professionalId, CLINIC_ID, DATE, '08:00')

      expect(result).toEqual({
        availability: RecurringOccurrenceAvailability.ALREADY_BOOKED,
        scheduleId: null,
        endTime: null,
      })
    })
  })
})
