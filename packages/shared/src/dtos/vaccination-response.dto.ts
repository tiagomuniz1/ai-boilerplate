export class VaccinationResponseDto {
  id!: string
  patientId!: string
  vaccineId!: string
  /** Desnormalizado na leitura para a caderneta não precisar de N chamadas. */
  vaccineName!: string
  vaccineAbbreviation!: string | null
  appointmentId!: string | null
  recordedByProfessionalId!: string
  recordedByProfessionalName!: string
  doseLabel!: string
  appliedAt!: string
  appliedAtOurClinic!: boolean
  appliedAtDescription!: string | null
  lotNumber!: string | null
  manufacturer!: string | null
  notes!: string | null
  createdAt!: Date
}
