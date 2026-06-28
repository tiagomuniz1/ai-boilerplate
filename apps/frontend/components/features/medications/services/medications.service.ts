import { apiClient } from '@/lib/api-client'
import type {
  CreateMedicationDto,
  MedicationResponseDto,
  PaginatedMedicationsResponseDto,
  UpdateMedicationDto,
} from '@app/shared'
import type { IMedicationListParams } from '../types/medication-model.types'

export const medicationsService = {
  getAll: (params?: IMedicationListParams) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.search) searchParams.set('search', params.search)
    if (params?.includeInactive) searchParams.set('includeInactive', 'true')
    const query = searchParams.toString()
    return apiClient.get<PaginatedMedicationsResponseDto>(`/medications${query ? `?${query}` : ''}`)
  },
  getById: (id: string) => apiClient.get<MedicationResponseDto>(`/medications/${id}`),
  create: (data: CreateMedicationDto) => apiClient.post<MedicationResponseDto>('/medications', data),
  update: (id: string, data: UpdateMedicationDto) =>
    apiClient.patch<MedicationResponseDto>(`/medications/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/medications/${id}`),
}
