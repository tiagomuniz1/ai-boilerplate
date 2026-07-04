export interface ICreateExamRequestInput {
  appointmentId: string
  items: Array<{ name: string; observations?: string }>
  notes?: string
}
