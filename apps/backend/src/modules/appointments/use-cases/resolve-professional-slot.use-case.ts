import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { GetActiveSchedulesForProfessionalUseCase } from '../../schedules/use-cases/get-active-schedules-for-professional.use-case'
import { GetActiveExceptionsForProfessionalUseCase } from '../../schedule-exceptions/use-cases/get-active-exceptions-for-professional.use-case'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { generateSlots, isSlotBlockedByExceptions } from '../utils/slot.util'

export interface ResolvedSlot {
  scheduleId: string
  endTime: string
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
    const schedules = await this.getActiveSchedulesUseCase.execute(professionalId, clinicId, date)

    let matchedSlot: { startTime: string; endTime: string; scheduleId: string } | undefined
    for (const schedule of schedules) {
      const found = generateSlots(schedule).find((slot) => slot.startTime === startTime)
      if (found) {
        matchedSlot = found
        break
      }
    }
    if (!matchedSlot) return null

    const exceptions = await this.getActiveExceptionsUseCase.execute(professionalId, clinicId, date)
    if (isSlotBlockedByExceptions(matchedSlot, exceptions)) return null

    const existing = await this.appointmentsRepository.findActiveBySlot(professionalId, date, startTime, clinicId)
    if (existing) return null

    return { scheduleId: matchedSlot.scheduleId, endTime: matchedSlot.endTime }
  }
}
