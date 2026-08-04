import { apiClient } from '@/lib/api-client'
import type {
  PatientResponseDto,
  PaginatedPatientsResponseDto,
  CreatePatientDto,
  UpdatePatientDto,
} from '@app/shared'
import type { IPatientListParams } from '../types/patient-input.types'

export const patientsService = {
  getAll: (params?: IPatientListParams) => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.excludeDependents) searchParams.set('excludeDependents', 'true')
    if (params?.excludeId) searchParams.set('excludeId', params.excludeId)
    const query = searchParams.toString()
    return apiClient.get<PaginatedPatientsResponseDto>(
      `/patients${query ? `?${query}` : ''}`,
    )
  },
  getById: (id: string) => apiClient.get<PatientResponseDto>(`/patients/${id}`),
  create: (data: CreatePatientDto) =>
    apiClient.post<PatientResponseDto>('/patients', data),
  update: (id: string, data: UpdatePatientDto) =>
    apiClient.patch<PatientResponseDto>(`/patients/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/patients/${id}`),
}
