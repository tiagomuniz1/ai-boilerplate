import { useQuery } from '@tanstack/react-query'
import { getProfessionalUseCase } from '../use-cases/get-professional.use-case'

export function useProfessional(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['professionals', id],
    queryFn: () => getProfessionalUseCase(id),
    enabled: options?.enabled ?? true,
  })
}
