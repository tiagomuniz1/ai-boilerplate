import { vaccineSchedulesService } from '../services/vaccine-schedules.service'
import type { IRecordDecisionInput } from '../types/vaccine-schedule.types'

export async function recordVaccineDecisionUseCase(data: IRecordDecisionInput): Promise<void> {
  await vaccineSchedulesService.recordDecision(data as never)
}
