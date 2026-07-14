import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import { createScheduleUseCase } from '../use-cases/create-schedule.use-case'
import type { ICreateScheduleInput } from '../types/schedule-input.types'
import type { IScheduleModel } from '../types/schedule-model.types'
import type { IApiError } from '@/types/api.types'

export function useCreateSchedule() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation<IScheduleModel, IApiError, ICreateScheduleInput>({
    mutationFn: createScheduleUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      router.push(`${basePath}/schedules`)
    },
  })
}
