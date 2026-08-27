import { DayOfWeek } from '../enums/day-of-week.enum'
import { RecurrenceInterval } from '../enums/recurrence-interval.enum'
import { AppointmentResponseDto } from './appointment-response.dto'

export class CreateRecurringAppointmentsResponseDto {
  seriesId: string
  recurrenceInterval: RecurrenceInterval
  dayOfWeek: DayOfWeek
  startTime: string
  createdOccurrenceCount: number
  appointments: AppointmentResponseDto[]
}
