import { useQuery } from '@tanstack/react-query'
import { listPrescriptionsUseCase } from '../use-cases/list-prescriptions.use-case'

export function usePrescriptions(appointmentId: string) {
  return useQuery({
    queryKey: ['prescriptions', appointmentId],
    queryFn: () => listPrescriptionsUseCase(appointmentId),
  })
}
