import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reassignAppointmentUseCase } from '../use-cases/reassign-appointment.use-case'
import type { IAppointmentModel } from '../types/appointment-model.types'
import type { IApiError } from '@/types/api.types'

export function useReassignAppointment() {
  const queryClient = useQueryClient()

  return useMutation<IAppointmentModel, IApiError, { id: string; professionalId: string }>({
    mutationFn: ({ id, professionalId }) => reassignAppointmentUseCase(id, professionalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
