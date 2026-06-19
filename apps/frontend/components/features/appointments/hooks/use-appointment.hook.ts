import { useQuery } from '@tanstack/react-query'
import { getAppointmentUseCase } from '../use-cases/get-appointment.use-case'

export function useAppointment(id: string) {
  return useQuery({
    queryKey: ['appointments', id],
    queryFn: () => getAppointmentUseCase(id),
    enabled: !!id,
  })
}
