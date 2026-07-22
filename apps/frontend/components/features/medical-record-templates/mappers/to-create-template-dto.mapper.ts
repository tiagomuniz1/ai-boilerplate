import type {
  CreateMedicalRecordTemplateDto,
  MedicalRecordTemplateSectionDto,
  MedicalRecordTemplateFieldDto,
} from '@app/shared'
import type { ICreateTemplateInput, ITemplateFieldInput, ITemplateSectionInput } from '../types/template-input.types'

function toSectionDto(section: ITemplateSectionInput): MedicalRecordTemplateSectionDto {
  const dto: MedicalRecordTemplateSectionDto = { title: section.title, order: section.order }
  if (section.key) dto.key = section.key
  return dto
}

function toFieldDto(field: ITemplateFieldInput): MedicalRecordTemplateFieldDto {
  const dto: MedicalRecordTemplateFieldDto = {
    label: field.label,
    type: field.type,
    required: field.required,
    order: field.order,
    canonical: field.canonical,
  }

  if (field.options.length > 0) dto.options = field.options
  if (field.placeholder) dto.placeholder = field.placeholder
  if (field.helpText) dto.helpText = field.helpText
  if (field.canonical && field.canonicalKey) dto.canonicalKey = field.canonicalKey
  if (field.sectionKey) dto.sectionKey = field.sectionKey

  return dto
}

export function toCreateTemplateDto(input: ICreateTemplateInput): CreateMedicalRecordTemplateDto {
  return {
    specialtyId: input.specialtyId,
    councilType: input.councilType,
    name: input.name,
    fields: input.fields.map((f) => toFieldDto(f)),
    sections: input.sections.map((s) => toSectionDto(s)),
  }
}
