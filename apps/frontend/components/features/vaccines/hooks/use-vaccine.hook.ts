import { useQuery } from '@tanstack/react-query'
import { getVaccineUseCase } from '../use-cases/get-vaccine.use-case'

export function useVaccine(id: string) {
  return useQuery({
    queryKey: ['vaccines', id],
    queryFn: () => getVaccineUseCase(id),
    enabled: !!id,
  })
}
