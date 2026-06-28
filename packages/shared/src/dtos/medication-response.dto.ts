import { MedicationSource } from '../enums/medication-source.enum'

export class MedicationResponseDto {
  id!: string
  name!: string
  activeIngredient!: string | null
  regulatoryCategory!: string | null
  therapeuticClass!: string | null
  holderCompany!: string | null
  registrationNumber!: string | null
  registrationStatus!: string | null
  source!: MedicationSource
  isActive!: boolean
  createdAt!: Date
}
