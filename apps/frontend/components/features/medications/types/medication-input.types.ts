export interface ICreateMedicationInput {
  name: string
  activeIngredient?: string
  regulatoryCategory?: string
  therapeuticClass?: string
  holderCompany?: string
  registrationNumber?: string
  registrationStatus?: string
}

export interface IUpdateMedicationInput {
  name?: string
  activeIngredient?: string
  regulatoryCategory?: string
  therapeuticClass?: string
  holderCompany?: string
  registrationNumber?: string
  registrationStatus?: string
  isActive?: boolean
}
