import { apiClient } from '@/lib/api-client'
import type { CanonicalFieldResponseDto } from '@app/shared'

export const canonicalFieldsService = {
  getAll: (specialtyId?: string) => {
    const searchParams = new URLSearchParams()
    if (specialtyId) searchParams.set('specialtyId', specialtyId)
    const query = searchParams.toString()
    return apiClient.get<CanonicalFieldResponseDto[]>(
      `/medical-record-canonical-fields${query ? `?${query}` : ''}`,
    )
  },
}
