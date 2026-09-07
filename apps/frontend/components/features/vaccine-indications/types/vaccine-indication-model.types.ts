export interface IVaccineIndicationItemModel {
  vaccineId: string
  name: string
  abbreviation: string | null
  doseLabel: string | null
  instructions: string | null
}

export interface IVaccineIndicationModel {
  id: string
  appointmentId: string
  patientId: string
  patientName: string
  professionalId: string
  professionalName: string
  issuedAt: Date
  items: IVaccineIndicationItemModel[]
  notes: string | null
  createdAt: Date
}
