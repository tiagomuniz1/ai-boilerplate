'use client'

import { useQuery } from '@tanstack/react-query'
import { listCanonicalFieldsUseCase } from '../use-cases/list-canonical-fields.use-case'

export function useCanonicalFields() {
  return useQuery({
    queryKey: ['canonical-fields-for-templates'],
    queryFn: listCanonicalFieldsUseCase,
  })
}
