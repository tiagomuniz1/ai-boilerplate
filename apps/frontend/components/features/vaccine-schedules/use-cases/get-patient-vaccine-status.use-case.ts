import { vaccineSchedulesService } from '../services/vaccine-schedules.service'
import type { IPatientVaccineStatus } from '../types/vaccine-schedule.types'

export async function getPatientVaccineStatusUseCase(
  patientId: string,
): Promise<IPatientVaccineStatus> {
  return vaccineSchedulesService.getPatientStatus(patientId)
}
