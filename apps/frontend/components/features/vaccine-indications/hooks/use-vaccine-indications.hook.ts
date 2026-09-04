import { useQuery } from '@tanstack/react-query'
import { listVaccineIndicationsUseCase } from '../use-cases/list-vaccine-indications.use-case'

export function useVaccineIndications(appointmentId: string) {
  return useQuery({
    queryKey: ['vaccine-indications', appointmentId],
    queryFn: () => listVaccineIndicationsUseCase(appointmentId),
  })
}
