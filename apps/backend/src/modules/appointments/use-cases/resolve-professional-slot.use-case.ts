import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { RecurringOccurrenceAvailability } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { GetActiveSchedulesForProfessionalUseCase } from '../../schedules/use-cases/get-active-schedules-for-professional.use-case'
import { GetActiveExceptionsForProfessionalUseCase } from '../../schedule-exceptions/use-cases/get-active-exceptions-for-professional.use-case'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { generateSlots, isSlotBlockedByExceptions } from '../utils/slot.util'

export interface ResolvedSlot {
  scheduleId: string
  endTime: string
}

export interface DetailedSlotResolution {
  availability: RecurringOccurrenceAvailability
  scheduleId: string | null
  endTime: string | null
}

/**
 * Resolves whether a given (date, startTime) is a valid, free slot on the
 * professional's own schedule — within working hours / on the slot grid, not
 * blocked by a schedule exception, and not already booked. Returns the matched
 * slot's scheduleId + endTime, or null when the professional cannot host it.
 *
 * Reused by the reassign flow (pre-check + candidate listing) to re-validate
 * the target professional's availability at the appointment's existing time.
 */
@Injectable()
export class ResolveProfessionalSlotUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly getActiveSchedulesUseCase: GetActiveSchedulesForProfessionalUseCase,
    private readonly getActiveExceptionsUseCase: GetActiveExceptionsForProfessionalUseCase,
  ) {
    super(dataSource)
  }

  async execute(
    professionalId: string,
    clinicId: string,
    date: string,
    startTime: string,
  ): Promise<ResolvedSlot | null> {
    const resolution = await this.executeDetailed(professionalId, clinicId, date, startTime)
    if (resolution.availability !== RecurringOccurrenceAvailability.AVAILABLE) return null

    return { scheduleId: resolution.scheduleId!, endTime: resolution.endTime! }
  }

  /**
   * Same checks as execute(), but reporting *why* a slot cannot be booked. The
   * recurring-appointments preview needs to tell the user whether a date is off
   * the schedule grid, blocked by an exception, or simply taken — execute()
   * collapses all three into null.
   */
  async executeDetailed(
    professionalId: string,
    clinicId: string,
    date: string,
    startTime: string,
  ): Promise<DetailedSlotResolution> {
    const schedules = await this.getActiveSchedulesUseCase.execute(professionalId, clinicId, date)

    let matchedSlot: { startTime: string; endTime: string; scheduleId: string } | undefined
    for (const schedule of schedules) {
      const found = generateSlots(schedule).find((slot) => slot.startTime === startTime)
      if (found) {
        matchedSlot = found
        break
      }
    }
    if (!matchedSlot) {
      return {
        availability: RecurringOccurrenceAvailability.OUTSIDE_SCHEDULE,
        scheduleId: null,
        endTime: null,
      }
    }

    const exceptions = await this.getActiveExceptionsUseCase.execute(professionalId, clinicId, date)
    if (isSlotBlockedByExceptions(matchedSlot, exceptions)) {
      return {
        availability: RecurringOccurrenceAvailability.BLOCKED_BY_EXCEPTION,
        scheduleId: null,
        endTime: null,
      }
    }

    const existing = await this.appointmentsRepository.findActiveBySlot(professionalId, date, startTime, clinicId)
    if (existing) {
      return {
        availability: RecurringOccurrenceAvailability.ALREADY_BOOKED,
        scheduleId: null,
        endTime: null,
      }
    }

    return {
      availability: RecurringOccurrenceAvailability.AVAILABLE,
      scheduleId: matchedSlot.scheduleId,
      endTime: matchedSlot.endTime,
    }
  }
}
