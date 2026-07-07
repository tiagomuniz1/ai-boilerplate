export interface ICreateExamRequestInput {
  appointmentId: string
  crmId?: string
  specialtyId?: string
  items: Array<{ name: string; observations?: string }>
  notes?: string
}
