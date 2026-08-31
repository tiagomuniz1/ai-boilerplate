import { MedicalRecordFieldType } from '@app/shared'
import type { CreateCanonicalFieldDto } from '@app/shared'
import type { ICreateCanonicalFieldInput } from '../types/canonical-field-input.types'

const SELECT_TYPES = [MedicalRecordFieldType.SELECT, MedicalRecordFieldType.MULTISELECT]

export function toCreateCanonicalFieldDto(input: ICreateCanonicalFieldInput): CreateCanonicalFieldDto {
  const dto: CreateCanonicalFieldDto = {
    canonicalKey: input.canonicalKey,
    label: input.label,
    type: input.type,
  }

  if (SELECT_TYPES.includes(input.type) && input.options !== undefined) {
    dto.options = input.options
  }

  if (input.unit !== undefined) dto.unit = input.unit
  if (input.description !== undefined) dto.description = input.description

  return dto
}
