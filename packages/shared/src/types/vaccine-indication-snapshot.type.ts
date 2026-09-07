import { CouncilType } from '../enums/council-type.enum'

export interface VaccineIndicationSnapshot {
  issuedAt: string
  clinic: {
    name: string
    address: {
      street: string | null
      number: string | null
      complement: string | null
      neighborhood: string | null
      city: string | null
      state: string | null
      zipCode: string | null
    } | null
    logoUrl: string | null
  }
  professional: {
    name: string
    councilType: CouncilType
    registrationNumber: string
    registryNumber: string | null
    specialtyName: string | null
  }
  patient: { name: string; documentNumber: string | null }
  items: Array<{
    vaccineId: string
    name: string
    abbreviation: string | null
    doseLabel: string | null
    instructions: string | null
  }>
  notes: string | null
}
