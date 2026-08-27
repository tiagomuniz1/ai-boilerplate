import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bookRecurringAppointmentsUseCase } from '../use-cases/book-recurring-appointments.use-case'
import type { IBookRecurringAppointmentsInput } from '../types/appointment-input.types'
import type { IRecurringAppointmentsResultModel } from '../types/appointment-model.types'
import type { IApiError } from '@/types/api.types'

export function useBookRecurringAppointments() {
  const queryClient = useQueryClient()

  return useMutation<IRecurringAppointmentsResultModel, IApiError, IBookRecurringAppointmentsInput>({
    mutationFn: bookRecurringAppointmentsUseCase,
    onSuccess: () => {
      // Prefix match: one invalidation covers every affected date.
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
