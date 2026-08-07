import { NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { DayOfWeek, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { GetActiveSchedulesForProfessionalUseCase } from '../../schedules/use-cases/get-active-schedules-for-professional.use-case'
import { GetActiveExceptionsForProfessionalUseCase } from '../../schedule-exceptions/use-cases/get-active-exceptions-for-professional.use-case'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { GetAvailabilityUseCase } from '../use-cases/get-availability.use-case'

const CLINIC_ID = 'clinic-uuid'
const doctorUserId = faker.string.uuid()
const professionalId = faker.string.uuid()

const doctorUser: ICurrentUser = { id: doctorUserId, role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

const DATE = '2025-06-20'

const makeSchedule = (overrides = {}) => ({
  id: faker.string.uuid(),
  professionalId,
  dayOfWeek: DayOfWeek.FRIDAY,
  startTime: '08:00',
  endTime: '10:00',
  slotDurationInMinutes: 30,
  validFrom: null,
  validUntil: null,
  ...overrides,
})

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByProfessionalAndDate: jest.fn(),
  findActiveBySlot: jest.fn(),
  hasFutureByScheduleId: jest.fn(),
  hasFutureByProfessionalId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
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

const mockGetActiveSchedules = {
  execute: jest.fn(),
} as unknown as jest.Mocked<GetActiveSchedulesForProfessionalUseCase>

const mockGetActiveExceptions = {
  execute: jest.fn(),
} as unknown as jest.Mocked<GetActiveExceptionsForProfessionalUseCase>

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
} as unknown as jest.Mocked<CacheService>

function makeMockDataSource(): DataSource {
  return {} as unknown as DataSource
}

describe('GetAvailabilityUseCase', () => {
  let useCase: GetAvailabilityUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GetAvailabilityUseCase(
      makeMockDataSource(),
      mockAppointmentsRepository,
      mockProfessionalsRepository,
      mockGetActiveSchedules,
      mockGetActiveExceptions,
      mockCacheService,
    )
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)
    mockProfessionalsRepository.findById.mockResolvedValue({ id: professionalId } as any)
    mockGetActiveSchedules.execute.mockResolvedValue([makeSchedule() as any])
    mockAppointmentsRepository.findActiveByProfessionalAndDate.mockResolvedValue([])
    mockGetActiveExceptions.execute.mockResolvedValue([])
  })

  describe('DOCTOR role', () => {
    it('resolves professionalId from profile', async () => {
      const result = await useCase.execute({ date: DATE }, doctorUser)
      expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(doctorUserId, CLINIC_ID)
      expect(result.professionalId).toBe(professionalId)
    })

    it('throws NotFoundException when doctor profile not found', async () => {
      mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
      await expect(useCase.execute({ date: DATE }, doctorUser)).rejects.toThrow(NotFoundException)
    })
  })

  describe('ADMIN/USER role', () => {
    it('requires professionalId in query', async () => {
      await expect(useCase.execute({ date: DATE }, adminUser)).rejects.toThrow(UnprocessableEntityException)
    })

    it('throws NotFoundException when doctor not found', async () => {
      mockProfessionalsRepository.findById.mockResolvedValue(null)
      await expect(useCase.execute({ date: DATE, professionalId }, adminUser)).rejects.toThrow(NotFoundException)
    })

    it('resolves professionalId from query', async () => {
      const result = await useCase.execute({ date: DATE, professionalId }, adminUser)
      expect(result.professionalId).toBe(professionalId)
    })
  })

  it('returns all slots when none are booked', async () => {
    const schedule = makeSchedule({ startTime: '08:00', endTime: '09:00', slotDurationInMinutes: 30 })
    mockGetActiveSchedules.execute.mockResolvedValue([schedule as any])
    mockAppointmentsRepository.findActiveByProfessionalAndDate.mockResolvedValue([])

    const result = await useCase.execute({ date: DATE, professionalId }, adminUser)

    expect(result.slots).toHaveLength(2)
    expect(result.slots[0].startTime).toBe('08:00')
    expect(result.slots[0].endTime).toBe('08:30')
    expect(result.slots[1].startTime).toBe('08:30')
    expect(result.slots[1].endTime).toBe('09:00')
  })

  it('excludes booked slots from available list', async () => {
    const schedule = makeSchedule({ startTime: '08:00', endTime: '09:00', slotDurationInMinutes: 30 })
    mockGetActiveSchedules.execute.mockResolvedValue([schedule as any])
    mockAppointmentsRepository.findActiveByProfessionalAndDate.mockResolvedValue([
      { startTime: '08:00' } as any,
    ])

    const result = await useCase.execute({ date: DATE, professionalId }, adminUser)

    expect(result.slots).toHaveLength(1)
    expect(result.slots[0].startTime).toBe('08:30')
  })

  it('returns empty slots when all booked', async () => {
    const schedule = makeSchedule({ startTime: '08:00', endTime: '08:30', slotDurationInMinutes: 30 })
    mockGetActiveSchedules.execute.mockResolvedValue([schedule as any])
    mockAppointmentsRepository.findActiveByProfessionalAndDate.mockResolvedValue([
      { startTime: '08:00' } as any,
    ])

    const result = await useCase.execute({ date: DATE, professionalId }, adminUser)
    expect(result.slots).toHaveLength(0)
  })

  it('returns empty slots when doctor has no active schedules', async () => {
    mockGetActiveSchedules.execute.mockResolvedValue([])
    const result = await useCase.execute({ date: DATE, professionalId }, adminUser)
    expect(result.slots).toHaveLength(0)
  })

  it('returns cached result without querying repository', async () => {
    const cached = { professionalId, date: DATE, slots: [] }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute({ date: DATE, professionalId }, adminUser)
    expect(result).toEqual(cached)
    expect(mockGetActiveSchedules.execute).not.toHaveBeenCalled()
    expect(mockAppointmentsRepository.findActiveByProfessionalAndDate).not.toHaveBeenCalled()
  })

  it('continues when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    await expect(useCase.execute({ date: DATE, professionalId }, adminUser)).resolves.toBeDefined()
    expect(mockGetActiveSchedules.execute).toHaveBeenCalled()
  })

  it('continues when cache write fails', async () => {
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))
    await expect(useCase.execute({ date: DATE, professionalId }, adminUser)).resolves.toBeDefined()
  })

  it('includes scheduleId in each slot', async () => {
    const schedule = makeSchedule({ startTime: '08:00', endTime: '08:30', slotDurationInMinutes: 30 })
    mockGetActiveSchedules.execute.mockResolvedValue([schedule as any])

    const result = await useCase.execute({ date: DATE, professionalId }, adminUser)
    expect(result.slots[0].scheduleId).toBe(schedule.id)
  })

  describe('exception filtering', () => {
    it('removes slot overlapping a partial exception', async () => {
      const schedule = makeSchedule({ startTime: '08:00', endTime: '10:00', slotDurationInMinutes: 30 })
      mockGetActiveSchedules.execute.mockResolvedValue([schedule as any])
      mockGetActiveExceptions.execute.mockResolvedValue([
        { startTime: '09:00', endTime: '10:00' } as any,
      ])

      const result = await useCase.execute({ date: DATE, professionalId }, adminUser)

      const slotTimes = result.slots.map((s) => s.startTime)
      expect(slotTimes).toContain('08:00')
      expect(slotTimes).toContain('08:30')
      expect(slotTimes).not.toContain('09:00')
      expect(slotTimes).not.toContain('09:30')
    })

    it('removes all slots when exception is all-day (null startTime/endTime)', async () => {
      const schedule = makeSchedule({ startTime: '08:00', endTime: '10:00', slotDurationInMinutes: 30 })
      mockGetActiveSchedules.execute.mockResolvedValue([schedule as any])
      mockGetActiveExceptions.execute.mockResolvedValue([
        { startTime: null, endTime: null } as any,
      ])

      const result = await useCase.execute({ date: DATE, professionalId }, adminUser)
      expect(result.slots).toHaveLength(0)
    })

    it('keeps slot that only touches exception border (slotEnd == blockStart)', async () => {
      const schedule = makeSchedule({ startTime: '08:00', endTime: '10:00', slotDurationInMinutes: 30 })
      mockGetActiveSchedules.execute.mockResolvedValue([schedule as any])
      mockGetActiveExceptions.execute.mockResolvedValue([
        { startTime: '08:30', endTime: '10:00' } as any,
      ])

      const result = await useCase.execute({ date: DATE, professionalId }, adminUser)

      const slotTimes = result.slots.map((s) => s.startTime)
      expect(slotTimes).toContain('08:00')
      expect(slotTimes).not.toContain('08:30')
    })

    it('keeps all slots when no exceptions exist', async () => {
      const schedule = makeSchedule({ startTime: '08:00', endTime: '09:00', slotDurationInMinutes: 30 })
      mockGetActiveSchedules.execute.mockResolvedValue([schedule as any])
      mockGetActiveExceptions.execute.mockResolvedValue([])

      const result = await useCase.execute({ date: DATE, professionalId }, adminUser)
      expect(result.slots).toHaveLength(2)
    })
  })
})
