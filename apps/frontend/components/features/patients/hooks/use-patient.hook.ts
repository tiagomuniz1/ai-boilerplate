import { useQuery } from '@tanstack/react-query'
import { getPatientUseCase } from '../use-cases/get-patient.use-case'

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => getPatientUseCase(id),
  })
}
