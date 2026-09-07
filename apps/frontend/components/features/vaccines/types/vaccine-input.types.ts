export interface ICreateVaccineInput {
  name: string
  abbreviation?: string
  preventedDiseases?: string
}

export interface IUpdateVaccineInput {
  name?: string
  abbreviation?: string
  preventedDiseases?: string
  isActive?: boolean
}
