import { apiClient } from '@/lib/api-client'
import type {
  CreateVaccineDto,
  PaginatedVaccinesResponseDto,
  UpdateVaccineDto,
  VaccineResponseDto,
} from '@app/shared'
import type { IVaccineListParams } from '../types/vaccine-model.types'

export const vaccinesService = {
  getAll: (params?: IVaccineListParams): Promise<PaginatedVaccinesResponseDto> => {
    const sp = new URLSearchParams()
    if (params?.search) sp.set('search', params.search)
    if (params?.includeInactive) sp.set('includeInactive', 'true')
    if (params?.page) sp.set('page', String(params.page))
    if (params?.limit) sp.set('limit', String(params.limit))
    const query = sp.toString()
    return apiClient.get<PaginatedVaccinesResponseDto>(`/vaccines${query ? `?${query}` : ''}`)
  },
  getById: (id: string) => apiClient.get<VaccineResponseDto>(`/vaccines/${id}`),
  create: (data: CreateVaccineDto) => apiClient.post<VaccineResponseDto>('/vaccines', data),
  update: (id: string, data: UpdateVaccineDto) =>
    apiClient.patch<VaccineResponseDto>(`/vaccines/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/vaccines/${id}`),
}
