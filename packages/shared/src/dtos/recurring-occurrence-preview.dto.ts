import { DayOfWeek } from '../enums/day-of-week.enum'
import { RecurrenceInterval } from '../enums/recurrence-interval.enum'
import { RecurringOccurrenceAvailability } from '../enums/recurring-occurrence-availability.enum'

export class RecurringOccurrencePreviewDto {
  date: string
  startTime: string
  endTime: string | null
  scheduleId: string | null
  availability: RecurringOccurrenceAvailability
  selectable: boolean
}

export class PreviewRecurringAppointmentsResponseDto {
  professionalId: string
  patientId: string
  recurrenceInterval: RecurrenceInterval
  dayOfWeek: DayOfWeek
  startTime: string
  occurrences: RecurringOccurrencePreviewDto[]
  availableOccurrenceCount: number
  unavailableOccurrenceCount: number
  truncatedByMaximumOccurrences: boolean
  truncatedByHorizon: boolean
}
