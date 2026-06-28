import type { UpdateMedicationDto } from '@app/shared'
import type { IUpdateMedicationInput } from '../types/medication-input.types'

export function toUpdateMedicationDto(input: IUpdateMedicationInput): UpdateMedicationDto {
  const dto: UpdateMedicationDto = {}

  if (input.name !== undefined) dto.name = input.name
  if (input.activeIngredient !== undefined) dto.activeIngredient = input.activeIngredient
  if (input.regulatoryCategory !== undefined) dto.regulatoryCategory = input.regulatoryCategory
  if (input.therapeuticClass !== undefined) dto.therapeuticClass = input.therapeuticClass
  if (input.holderCompany !== undefined) dto.holderCompany = input.holderCompany
  if (input.registrationNumber !== undefined) dto.registrationNumber = input.registrationNumber
  if (input.registrationStatus !== undefined) dto.registrationStatus = input.registrationStatus
  if (input.isActive !== undefined) dto.isActive = input.isActive

  return dto
}
