export interface IPrescriptionVerificationItem {
  name: string
  activeIngredient: string | null
  dosage: string | null
  quantity: string | null
}

export interface IPrescriptionVerificationModel {
  clinicName: string
  doctorName: string
  doctorCrmNumber: string
  specialtyName: string | null
  patientNameMasked: string
  patientDocumentMasked: string
  issuedAt: Date
  items: IPrescriptionVerificationItem[]
}
