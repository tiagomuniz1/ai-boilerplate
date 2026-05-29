import { useQuery } from '@tanstack/react-query'
import { getSpecialtyUseCase } from '../use-cases/get-specialty.use-case'

export function useSpecialty(id: string) {
  return useQuery({
    queryKey: ['specialties', id],
    queryFn: () => getSpecialtyUseCase(id),
  })
}
