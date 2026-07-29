import { useMutation, useQueryClient } from '@tanstack/react-query'
import { completeAppointmentUseCase } from '../use-cases/complete-appointment.use-case'
import type { IAppointmentModel } from '../types/appointment-model.types'
import type { IApiError } from '@/types/api.types'

export function useCompleteAppointment() {
  const queryClient = useQueryClient()

  return useMutation<IAppointmentModel, IApiError, string>({
    mutationFn: completeAppointmentUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
