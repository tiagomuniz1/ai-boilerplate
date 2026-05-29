import { useQuery } from '@tanstack/react-query'
import { listSpecialtiesUseCase } from '../use-cases/list-specialties.use-case'
import type { ISpecialtyListParams } from '../types/specialty-model.types'

export function useSpecialties(params?: ISpecialtyListParams) {
  return useQuery({
    queryKey: ['specialties', params],
    queryFn: () => listSpecialtiesUseCase(params),
  })
}
