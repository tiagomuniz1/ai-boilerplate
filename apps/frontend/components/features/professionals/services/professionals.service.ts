import { apiClient } from '@/lib/api-client'
import type {
  ProfessionalResponseDto,
  PaginatedProfessionalsResponseDto,
  CreateProfessionalDto,
  UpdateProfessionalDto,
} from '@app/shared'
import type { IProfessionalListParams } from '../types/professional-input.types'

export const professionalsService = {
  getAll: (params?: IProfessionalListParams) => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    const query = searchParams.toString()
    return apiClient.get<PaginatedProfessionalsResponseDto>(
      `/professionals${query ? `?${query}` : ''}`,
    )
  },
  getById: (id: string) => apiClient.get<ProfessionalResponseDto>(`/professionals/${id}`),
  create: (data: CreateProfessionalDto) => apiClient.post<ProfessionalResponseDto>('/professionals', data),
  update: (id: string, data: UpdateProfessionalDto) =>
    apiClient.patch<ProfessionalResponseDto>(`/professionals/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/professionals/${id}`),
}
