import { NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import {
  DayOfWeek,
  MAXIMUM_RECURRING_OCCURRENCES,
  RecurrenceInterval,
  RecurringOccurrenceAvailability,
  UserRole,
} from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { PreviewRecurringAppointmentsUseCase } from '../use-cases/preview-recurring-appointments.use-case'
import { ResolveProfessionalSlotUseCase } from '../use-cases/resolve-professional-slot.use-case'

const CLINIC_ID = 'clinic-uuid'
const professionalId = faker.string.uuid()
const doctorUserId = faker.string.uuid()
const patientId = faker.string.uuid()

// A Tuesday far enough in the future that "now" can never catch up with it.
const ANCHOR_DATE = '2099-06-16'
const START_TIME = '09:00'

const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }
const doctorUser: ICurrentUser = { id: doctorUserId, role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }

const makeDto = (overrides = {}) => ({
  professionalId,
  patientId,
  date: ANCHOR_DATE,
  startTime: START_TIME,
  recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
  occurrenceCount: 3,
  ...overrides,
})

const availableResolution = (scheduleId = faker.string.uuid()) => ({
  availability: RecurringOccurrenceAvailability.AVAILABLE,
  scheduleId,
  endTime: '09:30',
})

const unavailableResolution = (availability: RecurringOccurrenceAvailability) => ({
  availability,
  scheduleId: null,
  endTime: null,
})

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

describe('PreviewRecurringAppointmentsUseCase', () => {
  let useCase: PreviewRecurringAppointmentsUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new PreviewRecurringAppointmentsUseCase(
      {} as DataSource,
      mockProfessionalsRepository,
      mockPatientsRepository,
      mockResolveSlot,
    )
    mockProfessionalsRepository.findById.mockResolvedValue({ id: professionalId } as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)
    mockPatientsRepository.findById.mockResolvedValue({ id: patientId } as any)
    mockResolveSlot.executeDetailed.mockResolvedValue(availableResolution() as any)
  })

  describe('access control', () => {
    it('throws 422 when an admin omits professionalId', async () => {
      await expect(
        useCase.execute(makeDto({ professionalId: undefined }) as any, adminUser),
      ).rejects.toThrow(UnprocessableEntityException)
    })

    it('throws 404 when the professional does not exist', async () => {
      mockProfessionalsRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute(makeDto() as any, adminUser)).rejects.toThrow(NotFoundException)
    })

    it('throws 404 when the professional profile of the current user is missing', async () => {
      mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

      await expect(useCase.execute(makeDto() as any, doctorUser)).rejects.toThrow(NotFoundException)
    })

    it('ignores the requested professionalId for a PROFESSIONAL and uses their own profile', async () => {
      const ownProfessionalId = faker.string.uuid()
      mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: ownProfessionalId } as any)

      const result = await useCase.execute(
        makeDto({ professionalId: faker.string.uuid() }) as any,
        doctorUser,
      )

      expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(doctorUserId, CLINIC_ID)
      expect(mockProfessionalsRepository.findById).not.toHaveBeenCalled()
      expect(result.professionalId).toBe(ownProfessionalId)
    })

    it('throws 404 when the patient does not exist', async () => {
      mockPatientsRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute(makeDto() as any, adminUser)).rejects.toThrow(NotFoundException)
    })
  })

  describe('occurrence generation', () => {
    it('returns every occurrence as available on the happy path', async () => {
      const result = await useCase.execute(makeDto() as any, adminUser)

      expect(result.occurrences.map((occurrence) => occurrence.date)).toEqual([
        '2099-06-16',
        '2099-06-23',
        '2099-06-30',
      ])
      expect(result.occurrences.every((occurrence) => occurrence.selectable)).toBe(true)
      expect(result.availableOccurrenceCount).toBe(3)
      expect(result.unavailableOccurrenceCount).toBe(0)
      expect(result.dayOfWeek).toBe(DayOfWeek.TUESDAY)
      expect(result.startTime).toBe(START_TIME)
      expect(result.recurrenceInterval).toBe(RecurrenceInterval.EVERY_WEEK)
      expect(result.patientId).toBe(patientId)
    })

    it('spaces fortnightly occurrences two weeks apart', async () => {
      const result = await useCase.execute(
        makeDto({ recurrenceInterval: RecurrenceInterval.EVERY_TWO_WEEKS }) as any,
        adminUser,
      )

      expect(result.occurrences.map((occurrence) => occurrence.date)).toEqual([
        '2099-06-16',
        '2099-06-30',
        '2099-07-14',
      ])
    })

    it('throws 422 when untilDate precedes the first occurrence', async () => {
      await expect(
        useCase.execute(
          makeDto({ occurrenceCount: undefined, untilDate: '2099-06-01' }) as any,
          adminUser,
        ),
      ).rejects.toThrow(UnprocessableEntityException)
    })

    it('propagates the truncation flags', async () => {
      const result = await useCase.execute(
        makeDto({ occurrenceCount: undefined, untilDate: '2100-06-16' }) as any,
        adminUser,
      )

      expect(result.occurrences).toHaveLength(MAXIMUM_RECURRING_OCCURRENCES)
      expect(result.truncatedByMaximumOccurrences).toBe(true)
      expect(result.truncatedByHorizon).toBe(false)
    })
  })

  describe('per-occurrence availability', () => {
    it('reports an occurrence already taken', async () => {
      mockResolveSlot.executeDetailed
        .mockResolvedValueOnce(availableResolution() as any)
        .mockResolvedValueOnce(
          unavailableResolution(RecurringOccurrenceAvailability.ALREADY_BOOKED) as any,
        )
        .mockResolvedValueOnce(availableResolution() as any)

      const result = await useCase.execute(makeDto() as any, adminUser)

      expect(result.occurrences[1].availability).toBe(RecurringOccurrenceAvailability.ALREADY_BOOKED)
      expect(result.occurrences[1].selectable).toBe(false)
      expect(result.occurrences[1].endTime).toBeNull()
      expect(result.occurrences[1].scheduleId).toBeNull()
      expect(result.availableOccurrenceCount).toBe(2)
      expect(result.unavailableOccurrenceCount).toBe(1)
    })

    it('reports occurrences that fall outside the schedule, e.g. after validUntil', async () => {
      mockResolveSlot.executeDetailed
        .mockResolvedValueOnce(availableResolution() as any)
        .mockResolvedValueOnce(
          unavailableResolution(RecurringOccurrenceAvailability.OUTSIDE_SCHEDULE) as any,
        )
        .mockResolvedValueOnce(
          unavailableResolution(RecurringOccurrenceAvailability.OUTSIDE_SCHEDULE) as any,
        )

      const result = await useCase.execute(makeDto() as any, adminUser)

      expect(result.occurrences.map((occurrence) => occurrence.availability)).toEqual([
        RecurringOccurrenceAvailability.AVAILABLE,
        RecurringOccurrenceAvailability.OUTSIDE_SCHEDULE,
        RecurringOccurrenceAvailability.OUTSIDE_SCHEDULE,
      ])
      expect(result.availableOccurrenceCount).toBe(1)
    })

    it('reports an occurrence blocked by a schedule exception', async () => {
      mockResolveSlot.executeDetailed.mockResolvedValue(
        unavailableResolution(RecurringOccurrenceAvailability.BLOCKED_BY_EXCEPTION) as any,
      )

      const result = await useCase.execute(makeDto() as any, adminUser)

      expect(result.occurrences.every((o) => o.availability === RecurringOccurrenceAvailability.BLOCKED_BY_EXCEPTION)).toBe(
        true,
      )
      expect(result.availableOccurrenceCount).toBe(0)
    })

    it('marks a past anchor as IN_THE_PAST without querying the database for it', async () => {
      const result = await useCase.execute(
        makeDto({ date: '2020-06-16', occurrenceCount: 2 }) as any,
        adminUser,
      )

      expect(result.occurrences[0].availability).toBe(RecurringOccurrenceAvailability.IN_THE_PAST)
      expect(result.occurrences[0].selectable).toBe(false)
      expect(result.occurrences[1].availability).toBe(RecurringOccurrenceAvailability.IN_THE_PAST)
      expect(mockResolveSlot.executeDetailed).not.toHaveBeenCalled()
    })
  })
})
