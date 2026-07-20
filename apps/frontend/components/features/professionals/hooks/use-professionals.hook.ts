import { useQuery } from '@tanstack/react-query'
import { listProfessionalsUseCase } from '../use-cases/list-professionals.use-case'
import type { IProfessionalListParams } from '../types/professional-input.types'

export function useProfessionals(params?: IProfessionalListParams) {
  return useQuery({
    queryKey: ['professionals', params],
    queryFn: () => listProfessionalsUseCase(params),
  })
}
