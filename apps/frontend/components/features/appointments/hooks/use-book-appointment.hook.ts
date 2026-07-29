import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bookAppointmentUseCase } from '../use-cases/book-appointment.use-case'
import type { IBookAppointmentInput } from '../types/appointment-input.types'
import type { IAppointmentModel } from '../types/appointment-model.types'
import type { IApiError } from '@/types/api.types'

export function useBookAppointment() {
  const queryClient = useQueryClient()

  return useMutation<IAppointmentModel, IApiError, IBookAppointmentInput>({
    mutationFn: bookAppointmentUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
