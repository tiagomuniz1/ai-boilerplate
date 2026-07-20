export class ScheduleExceptionResponseDto {
  id: string
  professionalId: string
  date: string
  startTime: string | null
  endTime: string | null
  reason: string | null
  createdAt: Date
  updatedAt: Date
}
