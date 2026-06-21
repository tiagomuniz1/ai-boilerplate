import { useQuery } from '@tanstack/react-query'
import { listCanonicalFieldsAdminUseCase } from '../use-cases/list-canonical-fields-admin.use-case'
import type { ICanonicalFieldListParams } from '../types/canonical-field-model.types'

export function useCanonicalFieldsAdmin(params?: ICanonicalFieldListParams) {
  return useQuery({
    queryKey: ['canonical-fields', params],
    queryFn: () => listCanonicalFieldsAdminUseCase(params),
  })
}
