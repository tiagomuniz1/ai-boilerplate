import { PatientResponseDto } from './patient-response.dto'

export class PaginatedPatientsResponseDto {
  data!: PatientResponseDto[]
  total!: number
  page!: number
  limit!: number
}
