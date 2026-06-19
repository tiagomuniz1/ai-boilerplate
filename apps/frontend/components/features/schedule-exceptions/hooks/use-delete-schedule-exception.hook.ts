import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteScheduleExceptionUseCase } from '../use-cases/delete-schedule-exception.use-case'
import type { IApiError } from '@/types/api.types'

export function useDeleteScheduleException() {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: deleteScheduleExceptionUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-exceptions'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
    },
  })
}
