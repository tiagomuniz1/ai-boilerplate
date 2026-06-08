import { ClinicResponseDto } from './clinic-response.dto'

export class PaginatedClinicsResponseDto {
  data!: ClinicResponseDto[]
  total!: number
  page!: number
  limit!: number
}
