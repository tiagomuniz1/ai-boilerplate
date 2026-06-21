import { useQuery } from '@tanstack/react-query'
import { getCanonicalFieldAdminUseCase } from '../use-cases/get-canonical-field-admin.use-case'

export function useCanonicalFieldAdmin(id: string) {
  return useQuery({
    queryKey: ['canonical-field', id],
    queryFn: () => getCanonicalFieldAdminUseCase(id),
    enabled: !!id,
  })
}
