import { vaccineSchedulesService } from '../services/vaccine-schedules.service'
import type { IVaccineScheduleRuleModel } from '../types/vaccine-schedule.types'

export async function listScheduleRulesUseCase(
  vaccineId?: string,
): Promise<IVaccineScheduleRuleModel[]> {
  const rules = await vaccineSchedulesService.getRules(vaccineId)
  return rules.map((rule) => ({ ...rule, createdAt: new Date(rule.createdAt) }))
}
