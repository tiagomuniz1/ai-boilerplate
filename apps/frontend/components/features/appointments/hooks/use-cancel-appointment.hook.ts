import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelAppointmentUseCase } from '../use-cases/cancel-appointment.use-case'
import type { ICancelAppointmentInput } from '../types/appointment-input.types'
import type { IAppointmentModel } from '../types/appointment-model.types'
import type { IApiError } from '@/types/api.types'

export function useCancelAppointment() {
  const queryClient = useQueryClient()

  return useMutation<IAppointmentModel, IApiError, { id: string; data: ICancelAppointmentInput }>({
    mutationFn: ({ id, data }) => cancelAppointmentUseCase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
