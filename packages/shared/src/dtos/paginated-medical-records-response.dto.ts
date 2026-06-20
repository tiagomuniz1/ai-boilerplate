import { MedicalRecordResponseDto } from './medical-record-response.dto'

export class PaginatedMedicalRecordsResponseDto {
  data!: MedicalRecordResponseDto[]
  total!: number
  page!: number
  limit!: number
}
