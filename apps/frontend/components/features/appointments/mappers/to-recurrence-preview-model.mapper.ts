import type { PreviewRecurringAppointmentsResponseDto } from '@app/shared'
import type { IRecurrencePreviewModel } from '../types/appointment-model.types'

export function toRecurrencePreviewModel(
  dto: PreviewRecurringAppointmentsResponseDto,
): IRecurrencePreviewModel {
  return {
    professionalId: dto.professionalId,
    recurrenceInterval: dto.recurrenceInterval,
    dayOfWeek: dto.dayOfWeek,
    startTime: dto.startTime,
    occurrences: dto.occurrences.map((occurrence) => ({
      date: occurrence.date,
      startTime: occurrence.startTime,
      endTime: occurrence.endTime,
      availability: occurrence.availability,
      selectable: occurrence.selectable,
    })),
    availableOccurrenceCount: dto.availableOccurrenceCount,
    unavailableOccurrenceCount: dto.unavailableOccurrenceCount,
    truncatedByMaximumOccurrences: dto.truncatedByMaximumOccurrences,
    truncatedByHorizon: dto.truncatedByHorizon,
  }
}
