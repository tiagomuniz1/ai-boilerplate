import { MedicalRecordFieldType } from '../enums/medical-record-field-type.enum'
import { MedicalRecordFieldOptionDto } from './medical-record-field-option.dto'

export class CanonicalFieldResponseDto {
  id!: string
  canonicalKey!: string
  label!: string
  type!: MedicalRecordFieldType
  options!: MedicalRecordFieldOptionDto[] | null
  unit!: string | null
  specialtyId!: string | null
  description!: string | null
  isActive!: boolean
}
