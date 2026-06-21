export interface ICreateMedicalRecordInput {
  appointmentId: string
  data: Record<string, unknown>
  notes?: string
}

export interface IUpdateMedicalRecordInput {
  data?: Record<string, unknown>
  notes?: string
}
