import { DoctorResponseDto } from './doctor-response.dto'

export class PaginatedDoctorsResponseDto {
  data!: DoctorResponseDto[]
  total!: number
  page!: number
  limit!: number
}
