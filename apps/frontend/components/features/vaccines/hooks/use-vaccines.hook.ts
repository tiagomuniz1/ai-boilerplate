import { useQuery } from '@tanstack/react-query'
import { listVaccinesUseCase } from '../use-cases/list-vaccines.use-case'
import type { IVaccineListParams } from '../types/vaccine-model.types'

export function useVaccines(params?: IVaccineListParams) {
  return useQuery({
    queryKey: ['vaccines', params],
    queryFn: () => listVaccinesUseCase(params),
  })
}
