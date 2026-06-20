import { MedicalRecordTemplateResponseDto } from './medical-record-template-response.dto'

export class PaginatedMedicalRecordTemplatesResponseDto {
  data!: MedicalRecordTemplateResponseDto[]
  total!: number
  page!: number
  limit!: number
}
