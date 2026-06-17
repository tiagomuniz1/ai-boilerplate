import { ClinicSpecialtyResponseDto } from './clinic-specialty-response.dto'

export class PaginatedClinicSpecialtiesResponseDto {
  data!: ClinicSpecialtyResponseDto[]
  total!: number
  page!: number
  limit!: number
}
