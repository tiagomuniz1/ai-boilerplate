import { apiClient } from '@/lib/api-client'
import type {
  CreateVaccineDecisionDto,
  CreateVaccineScheduleRuleDto,
  PatientVaccineStatusResponseDto,
  UpdateVaccineScheduleRuleDto,
  VaccineScheduleRuleResponseDto,
} from '@app/shared'

export const vaccineSchedulesService = {
  getPatientStatus: (patientId: string) =>
    apiClient.get<PatientVaccineStatusResponseDto>(`/vaccine-schedules/patients/${patientId}`),
  recordDecision: (data: CreateVaccineDecisionDto) =>
    apiClient.post<unknown>('/vaccine-schedules/decisions', data),
  getRules: (vaccineId?: string) =>
    apiClient.get<VaccineScheduleRuleResponseDto[]>(
      `/vaccine-schedules/rules${vaccineId ? `?vaccineId=${vaccineId}` : ''}`,
    ),
  createRule: (data: CreateVaccineScheduleRuleDto) =>
    apiClient.post<VaccineScheduleRuleResponseDto>('/vaccine-schedules/rules', data),
  updateRule: (id: string, data: UpdateVaccineScheduleRuleDto) =>
    apiClient.patch<VaccineScheduleRuleResponseDto>(`/vaccine-schedules/rules/${id}`, data),
  deleteRule: (id: string) => apiClient.delete<void>(`/vaccine-schedules/rules/${id}`),
}
