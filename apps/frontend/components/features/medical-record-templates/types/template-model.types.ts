import type { CouncilType, MedicalRecordFieldType } from '@app/shared'

export interface ITemplateSectionModel {
  key: string
  title: string
  order: number
}

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
  sectionKey: string | null
}

export interface ITemplateModel {
  id: string
  specialtyId: string | null
  specialtyName: string | null
  councilType: CouncilType | null
  name: string
  fields: ITemplateFieldModel[]
  sections: ITemplateSectionModel[]
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
