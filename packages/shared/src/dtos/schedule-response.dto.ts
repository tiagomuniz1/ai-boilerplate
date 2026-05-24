import { DayOfWeek } from '../enums/day-of-week.enum'

export class ScheduleResponseDto {
  id: string
  doctorId: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  slotDurationInMinutes: number
  validFrom: string | null
  validUntil: string | null
  createdAt: Date
  updatedAt: Date
}
