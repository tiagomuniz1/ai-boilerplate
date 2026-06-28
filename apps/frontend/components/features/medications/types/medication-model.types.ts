import type { MedicationSource } from '@app/shared'

export interface IMedicationModel {
  id: string
  name: string
  activeIngredient: string | null
  regulatoryCategory: string | null
  therapeuticClass: string | null
  holderCompany: string | null
  registrationNumber: string | null
  registrationStatus: string | null
  source: MedicationSource
  isActive: boolean
  createdAt: Date
}

export interface IPaginatedMedications {
  data: IMedicationModel[]
  total: number
  page: number
  limit: number
}

export interface IMedicationListParams {
  page?: number
  limit?: number
  search?: string
  includeInactive?: boolean
}
