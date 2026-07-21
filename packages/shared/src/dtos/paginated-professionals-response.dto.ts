import { ProfessionalResponseDto } from './professional-response.dto'

export class PaginatedProfessionalsResponseDto {
  data!: ProfessionalResponseDto[]
  total!: number
  page!: number
  limit!: number
}
