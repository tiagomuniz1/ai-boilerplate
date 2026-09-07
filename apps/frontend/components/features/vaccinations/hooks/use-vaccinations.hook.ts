import { useQuery } from '@tanstack/react-query'
import { listVaccinationsUseCase } from '../use-cases/list-vaccinations.use-case'
import type { IVaccinationListParams } from '../types/vaccination-model.types'

export function useVaccinations(params: IVaccinationListParams) {
  return useQuery({
    queryKey: ['vaccinations', params],
    queryFn: () => listVaccinationsUseCase(params),
    enabled: !!(params.patientId || params.appointmentId),
  })
}
