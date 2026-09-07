export interface ICreateVaccineIndicationItemInput {
  vaccineId: string
  doseLabel?: string
  instructions?: string
}

export interface ICreateVaccineIndicationInput {
  appointmentId: string
  registrationId?: string
  specialtyId?: string
  items: ICreateVaccineIndicationItemInput[]
  notes?: string
}
