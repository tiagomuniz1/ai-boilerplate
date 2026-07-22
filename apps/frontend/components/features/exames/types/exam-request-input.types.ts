export interface ICreateExamRequestInput {
  appointmentId: string
  registrationId?: string
  specialtyId?: string
  items: Array<{ name: string; observations?: string }>
  notes?: string
}
