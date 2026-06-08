import { useQuery } from '@tanstack/react-query'
import { listClinicsUseCase } from '../use-cases/list-clinics.use-case'
import type { IClinicListParams } from '../types/clinic.types'

export function useClinics(params?: IClinicListParams) {
  return useQuery({
    queryKey: ['clinics', params],
    queryFn: () => listClinicsUseCase(params),
  })
}
