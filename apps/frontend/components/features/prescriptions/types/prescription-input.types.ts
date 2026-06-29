export interface ICreatePrescriptionItemInput {
  medicationId: string
  instructions: string
}

export interface ICreatePrescriptionInput {
  appointmentId: string
  items: ICreatePrescriptionItemInput[]
  notes?: string
}
