import { VaccinationResponseDto } from './vaccination-response.dto'

export class PaginatedVaccinationsResponseDto {
  data!: VaccinationResponseDto[]
  total!: number
  page!: number
  limit!: number
}
