import { apiClient } from '@/lib/api-client'
import type { CanonicalFieldResponseDto } from '@app/shared'

export const canonicalFieldsService = {
  getAll: () => apiClient.get<CanonicalFieldResponseDto[]>('/medical-record-canonical-fields'),
}
