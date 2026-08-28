import { DayOfWeek } from '../enums/day-of-week.enum'
import { RecurrenceInterval } from '../enums/recurrence-interval.enum'
import { AppointmentResponseDto } from './appointment-response.dto'

export class AppointmentSeriesResponseDto {
  id: string
  professionalId: string
  professionalName: string
  patientId: string
  patientName: string
  specialtyId: string | null
  specialtyName: string | null
  recurrenceInterval: RecurrenceInterval
  dayOfWeek: DayOfWeek
  startTime: string
  anchorDate: string
  requestedOccurrenceCount: number | null
  requestedUntilDate: string | null
  createdOccurrenceCount: number
  createdAt: Date
  occurrences: AppointmentResponseDto[]
}
