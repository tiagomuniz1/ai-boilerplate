import { useQuery } from '@tanstack/react-query'
import { listMedicationsUseCase } from '../use-cases/list-medications.use-case'
import type { IMedicationListParams } from '../types/medication-model.types'

export function useMedications(params?: IMedicationListParams) {
  return useQuery({
    queryKey: ['medications', params],
    queryFn: () => listMedicationsUseCase(params),
  })
}
