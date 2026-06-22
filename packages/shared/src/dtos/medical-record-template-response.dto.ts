import { MedicalRecordTemplateFieldDto } from './medical-record-template-field.dto'
import { MedicalRecordTemplateSectionDto } from './medical-record-template-section.dto'

export class MedicalRecordTemplateResponseDto {
  id!: string
  specialtyId!: string
  specialtyName!: string
  name!: string
  fields!: MedicalRecordTemplateFieldDto[]
  sections!: MedicalRecordTemplateSectionDto[]
  isActive!: boolean
  createdAt!: Date
  updatedAt!: Date
}
