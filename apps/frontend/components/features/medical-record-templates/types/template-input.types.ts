import type { CouncilType, MedicalRecordFieldType } from '@app/shared'

export interface ITemplateSectionInput {
  key?: string
  title: string
  order: number
}

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
  sectionKey: string
}

export interface ICreateTemplateInput {
  specialtyId?: string
  councilType?: CouncilType
  name: string
  fields: ITemplateFieldInput[]
  sections: ITemplateSectionInput[]
}

export interface IUpdateTemplateInput {
  name?: string
  fields?: ITemplateFieldInput[]
  sections?: ITemplateSectionInput[]
  isActive?: boolean
}
