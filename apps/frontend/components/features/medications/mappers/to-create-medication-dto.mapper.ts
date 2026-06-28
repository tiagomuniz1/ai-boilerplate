import type { CreateMedicationDto } from '@app/shared'
import type { ICreateMedicationInput } from '../types/medication-input.types'

export function toCreateMedicationDto(input: ICreateMedicationInput): CreateMedicationDto {
  const dto: CreateMedicationDto = { name: input.name }

  if (input.activeIngredient !== undefined) dto.activeIngredient = input.activeIngredient
  if (input.regulatoryCategory !== undefined) dto.regulatoryCategory = input.regulatoryCategory
  if (input.therapeuticClass !== undefined) dto.therapeuticClass = input.therapeuticClass
  if (input.holderCompany !== undefined) dto.holderCompany = input.holderCompany
  if (input.registrationNumber !== undefined) dto.registrationNumber = input.registrationNumber
  if (input.registrationStatus !== undefined) dto.registrationStatus = input.registrationStatus

  return dto
}
