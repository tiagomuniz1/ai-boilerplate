import type { PreviewRecurringAppointmentsDto } from '@app/shared'
import type { IRecurrencePreviewInput } from '../types/appointment-input.types'

export function toRecurrencePreviewDto(
  input: IRecurrencePreviewInput,
): PreviewRecurringAppointmentsDto {
  return {
    professionalId: input.professionalId,
    patientId: input.patientId,
    date: input.date,
    startTime: input.startTime,
    recurrenceInterval: input.recurrenceInterval,
    occurrenceCount: input.occurrenceCount,
    untilDate: input.untilDate,
  }
}
