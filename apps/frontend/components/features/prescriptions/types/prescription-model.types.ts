export interface IPrescriptionItemModel {
  medicationId: string | null
  name: string
  activeIngredient: string | null
  dosage: string | null
  quantity: string | null
  instructions: string
}

export interface IPrescriptionModel {
  id: string
  appointmentId: string
  patientId: string
  patientName: string
  professionalId: string
  professionalName: string
  issuedAt: Date
  items: IPrescriptionItemModel[]
  notes: string | null
  createdAt: Date
}
