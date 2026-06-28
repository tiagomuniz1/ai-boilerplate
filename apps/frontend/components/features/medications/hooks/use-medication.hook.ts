import { useQuery } from '@tanstack/react-query'
import { getMedicationUseCase } from '../use-cases/get-medication.use-case'

export function useMedication(id: string) {
  return useQuery({
    queryKey: ['medication', id],
    queryFn: () => getMedicationUseCase(id),
    enabled: !!id,
  })
}
