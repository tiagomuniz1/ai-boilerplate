import { VaccineScheduleRuleResponseDto } from '@app/shared'
import { VaccineScheduleRule } from './entities/vaccine-schedule-rule.entity'

export function toRuleResponse(rule: VaccineScheduleRule): VaccineScheduleRuleResponseDto {
  return {
    id: rule.id,
    vaccineId: rule.vaccineId,
    vaccineName: rule.vaccine.name,
    doseLabel: rule.doseLabel,
    doseOrder: rule.doseOrder,
    minAgeMonths: rule.minAgeMonths,
    maxAgeMonths: rule.maxAgeMonths,
    minIntervalDays: rule.minIntervalDays,
    appliesToGender: rule.appliesToGender,
    isActive: rule.isActive,
    createdAt: rule.createdAt,
  }
}
