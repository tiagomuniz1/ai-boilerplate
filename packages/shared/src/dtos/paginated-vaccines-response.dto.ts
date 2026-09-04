import { VaccineResponseDto } from './vaccine-response.dto'

export class PaginatedVaccinesResponseDto {
  data!: VaccineResponseDto[]
  total!: number
  page!: number
  limit!: number
}
