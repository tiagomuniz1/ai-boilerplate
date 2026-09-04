export class VaccineIndicationItemResponseDto {
  vaccineId!: string
  name!: string
  abbreviation!: string | null
  doseLabel!: string | null
  instructions!: string | null
}

export class VaccineIndicationResponseDto {
  id!: string
  appointmentId!: string
  patientId!: string
  patientName!: string
  professionalId!: string
  professionalName!: string
  issuedAt!: Date
  items!: VaccineIndicationItemResponseDto[]
  notes!: string | null
  createdAt!: Date
}
