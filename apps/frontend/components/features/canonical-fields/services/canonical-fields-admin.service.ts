import { apiClient } from '@/lib/api-client'
import type { CanonicalFieldResponseDto, CreateCanonicalFieldDto, UpdateCanonicalFieldDto } from '@app/shared'
import type { ICanonicalFieldListParams } from '../types/canonical-field-model.types'

export const canonicalFieldsAdminService = {
  getAll: (params?: ICanonicalFieldListParams) => {
    const searchParams = new URLSearchParams()
    if (params?.specialtyId) searchParams.set('specialtyId', params.specialtyId)
    if (params?.includeInactive) searchParams.set('includeInactive', 'true')
    const query = searchParams.toString()
    return apiClient.get<CanonicalFieldResponseDto[]>(
      `/medical-record-canonical-fields${query ? `?${query}` : ''}`,
    )
  },
  getById: (id: string) =>
    apiClient.get<CanonicalFieldResponseDto>(`/medical-record-canonical-fields/${id}`),
  create: (data: CreateCanonicalFieldDto) =>
    apiClient.post<CanonicalFieldResponseDto>('/medical-record-canonical-fields', data),
  update: (id: string, data: UpdateCanonicalFieldDto) =>
    apiClient.patch<CanonicalFieldResponseDto>(`/medical-record-canonical-fields/${id}`, data),
}
