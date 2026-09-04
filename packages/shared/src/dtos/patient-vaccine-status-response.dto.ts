import { VaccineDecision } from '../enums/vaccine-decision.enum'
import { VaccineScheduleStatus } from '../enums/vaccine-schedule-status.enum'

export class PatientVaccineStatusItemDto {
  vaccineId!: string
  vaccineName!: string
  vaccineAbbreviation!: string | null
  status!: VaccineScheduleStatus
  /** A próxima dose devida, quando houver. */
  nextDoseLabel!: string | null
  /** Data a partir da qual a próxima dose é devida (ISO, só o dia). */
  nextDoseDueFrom!: string | null
  dosesTaken!: number
  dosesExpected!: number
  /** Decisão registrada pelo profissional, se houver. */
  decision!: VaccineDecision | null
  decisionReason!: string | null
  decidedByProfessionalName!: string | null
}

export class PatientVaccineStatusResponseDto {
  patientId!: string
  ageInMonths!: number
  items!: PatientVaccineStatusItemDto[]
}
