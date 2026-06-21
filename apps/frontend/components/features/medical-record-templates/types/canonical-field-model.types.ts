import type { MedicalRecordFieldType } from '@app/shared'

export interface ICanonicalFieldModel {
  id: string
  canonicalKey: string
  label: string
  type: MedicalRecordFieldType
  options: { value: string; label: string }[] | null
  unit: string | null
  specialtyId: string | null
  description: string | null
}
