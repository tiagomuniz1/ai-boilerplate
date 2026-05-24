import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteScheduleUseCase } from '../use-cases/delete-schedule.use-case'
import type { IApiError } from '@/types/api.types'

export function useDeleteSchedule() {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: deleteScheduleUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}
