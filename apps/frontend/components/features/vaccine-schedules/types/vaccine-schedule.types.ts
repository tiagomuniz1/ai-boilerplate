import type { PatientGender, VaccineDecision, VaccineScheduleStatus } from '@app/shared'

export interface IVaccineScheduleRuleModel {
  id: string
  vaccineId: string
  vaccineName: string
  doseLabel: string
  doseOrder: number
  minAgeMonths: number
  maxAgeMonths: number | null
  minIntervalDays: number | null
  appliesToGender: PatientGender | null
  isActive: boolean
  createdAt: Date
}

export interface IPatientVaccineStatusItem {
  vaccineId: string
  vaccineName: string
  vaccineAbbreviation: string | null
  status: VaccineScheduleStatus
  nextDoseLabel: string | null
  nextDoseDueFrom: string | null
  dosesTaken: number
  dosesExpected: number
  decision: VaccineDecision | null
  decisionReason: string | null
  decidedByProfessionalName: string | null
}

export interface IPatientVaccineStatus {
  patientId: string
  ageInMonths: number
  items: IPatientVaccineStatusItem[]
}

export interface ICreateScheduleRuleInput {
  vaccineId: string
  doseLabel: string
  doseOrder: number
  minAgeMonths: number
  maxAgeMonths?: number
  minIntervalDays?: number
  appliesToGender?: PatientGender
}

export interface IRecordDecisionInput {
  patientId: string
  vaccineId: string
  decision: VaccineDecision
  reason?: string
}
