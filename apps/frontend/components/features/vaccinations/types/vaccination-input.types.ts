export interface ICreateVaccinationInput {
  patientId: string
  vaccineId: string
  appointmentId?: string
  doseLabel: string
  appliedAt: string
  appliedAtOurClinic?: boolean
  appliedAtDescription?: string
  lotNumber?: string
  manufacturer?: string
  notes?: string
}

export interface IUpdateVaccinationInput {
  doseLabel?: string
  appliedAt?: string
  appliedAtOurClinic?: boolean
  appliedAtDescription?: string
  lotNumber?: string
  manufacturer?: string
  notes?: string
}
