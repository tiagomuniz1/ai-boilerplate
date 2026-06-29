export class PrescriptionItemResponseDto {
  medicationId!: string | null
  name!: string
  activeIngredient!: string | null
  instructions!: string
}

export class PrescriptionResponseDto {
  id!: string
  appointmentId!: string
  patientId!: string
  patientName!: string
  doctorId!: string
  doctorName!: string
  issuedAt!: Date
  items!: PrescriptionItemResponseDto[]
  notes!: string | null
  createdAt!: Date
}
