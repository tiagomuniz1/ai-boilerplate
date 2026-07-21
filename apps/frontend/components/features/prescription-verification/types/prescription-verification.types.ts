import type { CouncilType } from '@app/shared'

export interface IPrescriptionVerificationItem {
  name: string
  activeIngredient: string | null
  dosage: string | null
  quantity: string | null
}

export interface IPrescriptionVerificationModel {
  clinicName: string
  professionalName: string
  professionalCouncilType: CouncilType
  professionalRegistrationNumber: string
  specialtyName: string | null
  patientNameMasked: string
  patientDocumentMasked: string
  issuedAt: Date
  items: IPrescriptionVerificationItem[]
}
