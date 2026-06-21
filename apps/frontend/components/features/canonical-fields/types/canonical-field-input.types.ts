import type { MedicalRecordFieldType } from '@app/shared'

export interface ICreateCanonicalFieldInput {
  canonicalKey: string
  label: string
  type: MedicalRecordFieldType
  options?: { value: string; label: string }[]
  unit?: string
  specialtyId?: string
  description?: string
}

export interface IUpdateCanonicalFieldInput {
  label?: string
  type?: MedicalRecordFieldType
  options?: { value: string; label: string }[]
  unit?: string
  specialtyId?: string
  description?: string
  isActive?: boolean
}
