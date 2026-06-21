import type { MedicalRecordFieldType } from '@app/shared'

export interface ITemplateFieldModel {
  key?: string
  label: string
  type: MedicalRecordFieldType
  required: boolean
  order: number
  options: { value: string; label: string }[] | null
  placeholder: string | null
  helpText: string | null
  canonical: boolean
  canonicalKey: string | null
}

export interface ITemplateModel {
  id: string
  specialtyId: string
  specialtyName: string
  name: string
  fields: ITemplateFieldModel[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IPaginatedTemplatesModel {
  data: ITemplateModel[]
  total: number
  page: number
  limit: number
}
