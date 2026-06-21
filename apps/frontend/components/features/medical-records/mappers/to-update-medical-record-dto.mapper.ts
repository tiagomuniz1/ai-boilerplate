import type { UpdateMedicalRecordDto } from '@app/shared'
import type { IUpdateMedicalRecordInput } from '../types/medical-record-input.types'

export function toUpdateMedicalRecordDto(input: IUpdateMedicalRecordInput): UpdateMedicalRecordDto {
  const dto: UpdateMedicalRecordDto = {}
  if (input.data !== undefined) dto.data = input.data
  if (input.notes !== undefined) dto.notes = input.notes
  return dto
}
