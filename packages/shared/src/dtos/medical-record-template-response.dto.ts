import { MedicalRecordTemplateFieldDto } from './medical-record-template-field.dto'

export class MedicalRecordTemplateResponseDto {
  id!: string
  specialtyId!: string
  specialtyName!: string
  name!: string
  fields!: MedicalRecordTemplateFieldDto[]
  isActive!: boolean
  createdAt!: Date
  updatedAt!: Date
}
