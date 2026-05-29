import { SpecialtyResponseDto } from './specialty-response.dto'

export class PaginatedSpecialtiesResponseDto {
  data!: SpecialtyResponseDto[]
  total!: number
  page!: number
  limit!: number
}
