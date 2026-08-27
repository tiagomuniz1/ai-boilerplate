import type { CreateRecurringAppointmentsDto } from '@app/shared'
import type { IBookRecurringAppointmentsInput } from '../types/appointment-input.types'

export function toBookRecurringAppointmentsDto(
  input: IBookRecurringAppointmentsInput,
): CreateRecurringAppointmentsDto {
  return {
    professionalId: input.professionalId,
    specialtyId: input.specialtyId || undefined,
    patientId: input.patientId,
    startTime: input.startTime,
    recurrenceInterval: input.recurrenceInterval,
    dates: input.dates,
    occurrenceCount: input.occurrenceCount,
    untilDate: input.untilDate,
    reason: input.reason || undefined,
  }
}
