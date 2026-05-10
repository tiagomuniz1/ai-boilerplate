import { useQuery } from '@tanstack/react-query'
import { listPatientsUseCase } from '../use-cases/list-patients.use-case'
import type { IPatientListParams } from '../types/patient-input.types'

export function usePatients(params?: IPatientListParams) {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: () => listPatientsUseCase(params),
  })
}
