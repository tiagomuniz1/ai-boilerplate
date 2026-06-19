import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createScheduleExceptionUseCase } from '../use-cases/create-schedule-exception.use-case'
import type { ICreateScheduleExceptionInput } from '../types/schedule-exception-input.types'
import type { IScheduleExceptionModel } from '../types/schedule-exception-model.types'
import type { IApiError } from '@/types/api.types'

export function useCreateScheduleException() {
  const queryClient = useQueryClient()

  return useMutation<IScheduleExceptionModel, IApiError, ICreateScheduleExceptionInput>({
    mutationFn: createScheduleExceptionUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-exceptions'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
    },
  })
}
