import { AppointmentResponseDto } from './appointment-response.dto'

export class PaginatedAppointmentsResponseDto {
  data: AppointmentResponseDto[]
  total: number
  page: number
  limit: number
}
