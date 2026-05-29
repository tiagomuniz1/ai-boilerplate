import { apiClient } from '@/lib/api-client'
import type {
  SpecialtyResponseDto,
  PaginatedSpecialtiesResponseDto,
  CreateSpecialtyDto,
  UpdateSpecialtyDto,
} from '@app/shared'
import type { ISpecialtyListParams } from '../types/specialty-model.types'

export const specialtiesService = {
  getAll: (params?: ISpecialtyListParams) => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    const query = searchParams.toString()
    return apiClient.get<PaginatedSpecialtiesResponseDto>(
      `/specialties${query ? `?${query}` : ''}`,
    )
  },
  getById: (id: string) => apiClient.get<SpecialtyResponseDto>(`/specialties/${id}`),
  create: (data: CreateSpecialtyDto) => apiClient.post<SpecialtyResponseDto>('/specialties', data),
  update: (id: string, data: UpdateSpecialtyDto) =>
    apiClient.patch<SpecialtyResponseDto>(`/specialties/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/specialties/${id}`),
}
