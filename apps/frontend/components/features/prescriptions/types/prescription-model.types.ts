export interface IPrescriptionItemModel {
  medicationId: string | null
  name: string
  activeIngredient: string | null
  instructions: string
}

export interface IPrescriptionModel {
  id: string
  appointmentId: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  issuedAt: Date
  items: IPrescriptionItemModel[]
  notes: string | null
  createdAt: Date
}
