import type { CreateMedicalRecordTemplateDto, MedicalRecordTemplateFieldDto } from '@app/shared'
import type { ICreateTemplateInput, ITemplateFieldInput } from '../types/template-input.types'

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

  return dto
}

export function toCreateTemplateDto(input: ICreateTemplateInput): CreateMedicalRecordTemplateDto {
  return {
    specialtyId: input.specialtyId,
    name: input.name,
    fields: input.fields.map((f) => toFieldDto(f)),
  }
}
