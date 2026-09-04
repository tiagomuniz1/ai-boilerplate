import { PatientGender } from '../enums/patient-gender.enum'

export class VaccineScheduleRuleResponseDto {
  id!: string
  vaccineId!: string
  vaccineName!: string
  doseLabel!: string
  doseOrder!: number
  minAgeMonths!: number
  maxAgeMonths!: number | null
  minIntervalDays!: number | null
  appliesToGender!: PatientGender | null
  isActive!: boolean
  createdAt!: Date
}
