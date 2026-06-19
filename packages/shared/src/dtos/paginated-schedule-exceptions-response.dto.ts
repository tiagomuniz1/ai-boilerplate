import { ScheduleExceptionResponseDto } from './schedule-exception-response.dto'

export class PaginatedScheduleExceptionsResponseDto {
  data: ScheduleExceptionResponseDto[]
  total: number
  page: number
  limit: number
}
