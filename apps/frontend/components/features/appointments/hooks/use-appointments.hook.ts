import { useQuery } from '@tanstack/react-query'
import { listAppointmentsUseCase } from '../use-cases/list-appointments.use-case'
import type { IAppointmentListParams } from '../types/appointment-input.types'

export function useAppointments(params?: IAppointmentListParams) {
  return useQuery({
    queryKey: ['appointments', params],
    queryFn: () => listAppointmentsUseCase(params),
  })
}
