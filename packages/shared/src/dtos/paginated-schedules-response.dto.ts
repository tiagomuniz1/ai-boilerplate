import { ScheduleResponseDto } from './schedule-response.dto'

export class PaginatedSchedulesResponseDto {
  data: ScheduleResponseDto[]
  total: number
  page: number
  limit: number
}
