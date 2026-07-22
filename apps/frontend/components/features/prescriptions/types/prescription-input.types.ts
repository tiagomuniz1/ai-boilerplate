export interface ICreatePrescriptionItemInput {
  medicationId?: string
  activeIngredientName?: string
  dosage?: string
  quantity?: string
  instructions: string
}

export interface ICreatePrescriptionInput {
  appointmentId: string
  registrationId?: string
  specialtyId?: string
  items: ICreatePrescriptionItemInput[]
  notes?: string
}
