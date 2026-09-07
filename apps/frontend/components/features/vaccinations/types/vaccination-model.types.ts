export interface IVaccinationModel {
  id: string
  patientId: string
  vaccineId: string
  vaccineName: string
  vaccineAbbreviation: string | null
  appointmentId: string | null
  recordedByProfessionalId: string
  recordedByProfessionalName: string
  doseLabel: string
  appliedAt: string
  appliedAtOurClinic: boolean
  appliedAtDescription: string | null
  lotNumber: string | null
  manufacturer: string | null
  notes: string | null
  createdAt: Date
}

export interface IPaginatedVaccinations {
  data: IVaccinationModel[]
  total: number
  page: number
  limit: number
}

export interface IVaccinationListParams {
  patientId?: string
  appointmentId?: string
  page?: number
  limit?: number
}
