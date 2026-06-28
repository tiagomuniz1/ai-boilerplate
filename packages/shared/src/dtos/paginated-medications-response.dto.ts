import { MedicationResponseDto } from './medication-response.dto'

export class PaginatedMedicationsResponseDto {
  data!: MedicationResponseDto[]
  total!: number
  page!: number
  limit!: number
}
