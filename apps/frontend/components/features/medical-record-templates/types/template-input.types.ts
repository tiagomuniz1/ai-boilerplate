import type { MedicalRecordFieldType } from '@app/shared'

export interface ITemplateFieldInput {
  key?: string
  label: string
  type: MedicalRecordFieldType
  required: boolean
  order: number
  options: { value: string; label: string }[]
  placeholder: string
  helpText: string
  canonical: boolean
  canonicalKey: string
}

export interface ICreateTemplateInput {
  specialtyId: string
  name: string
  fields: ITemplateFieldInput[]
}

export interface IUpdateTemplateInput {
  name?: string
  fields?: ITemplateFieldInput[]
  isActive?: boolean
}
