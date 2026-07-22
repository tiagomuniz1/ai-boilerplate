import { CouncilType } from '../enums/council-type.enum'
import { MedicalRecordTemplateFieldDto } from './medical-record-template-field.dto'
import { MedicalRecordTemplateSectionDto } from './medical-record-template-section.dto'

export class MedicalRecordTemplateResponseDto {
  id!: string
  specialtyId!: string | null
  specialtyName!: string | null
  councilType!: CouncilType | null
  name!: string
  fields!: MedicalRecordTemplateFieldDto[]
  sections!: MedicalRecordTemplateSectionDto[]
  isActive!: boolean
  createdAt!: Date
  updatedAt!: Date
}
