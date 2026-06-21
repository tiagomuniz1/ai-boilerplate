import type { UpdateMedicalRecordTemplateDto, MedicalRecordTemplateFieldDto } from '@app/shared'
import type { IUpdateTemplateInput, ITemplateFieldInput } from '../types/template-input.types'

function toFieldDto(field: ITemplateFieldInput): MedicalRecordTemplateFieldDto {
  const dto: MedicalRecordTemplateFieldDto = {
    label: field.label,
    type: field.type,
    required: field.required,
    order: field.order,
    canonical: field.canonical,
  }

  if (field.key) dto.key = field.key
  if (field.options.length > 0) dto.options = field.options
  if (field.placeholder) dto.placeholder = field.placeholder
  if (field.helpText) dto.helpText = field.helpText
  if (field.canonical && field.canonicalKey) dto.canonicalKey = field.canonicalKey

  return dto
}

export function toUpdateTemplateDto(input: IUpdateTemplateInput): UpdateMedicalRecordTemplateDto {
  const dto: UpdateMedicalRecordTemplateDto = {}
  if (input.name !== undefined) dto.name = input.name
  if (input.isActive !== undefined) dto.isActive = input.isActive
  if (input.fields !== undefined) dto.fields = input.fields.map((f) => toFieldDto(f))
  return dto
}
