import { MedicalRecordFieldType } from '@app/shared'
import type { UpdateCanonicalFieldDto } from '@app/shared'
import type { IUpdateCanonicalFieldInput } from '../types/canonical-field-input.types'

const SELECT_TYPES = [MedicalRecordFieldType.SELECT, MedicalRecordFieldType.MULTISELECT]

export function toUpdateCanonicalFieldDto(input: IUpdateCanonicalFieldInput): UpdateCanonicalFieldDto {
  const dto: UpdateCanonicalFieldDto = {}

  if (input.label !== undefined) dto.label = input.label
  if (input.type !== undefined) dto.type = input.type
  if (input.unit !== undefined) dto.unit = input.unit
  if (input.specialtyId !== undefined) dto.specialtyId = input.specialtyId
  if (input.description !== undefined) dto.description = input.description
  if (input.isActive !== undefined) dto.isActive = input.isActive

  const effectiveType = input.type
  if (effectiveType && SELECT_TYPES.includes(effectiveType) && input.options !== undefined) {
    dto.options = input.options
  }

  return dto
}
