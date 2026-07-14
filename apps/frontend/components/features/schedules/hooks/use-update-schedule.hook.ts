import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import { updateScheduleUseCase } from '../use-cases/update-schedule.use-case'
import type { IUpdateScheduleInput } from '../types/schedule-input.types'
import type { IScheduleModel } from '../types/schedule-model.types'
import type { IApiError } from '@/types/api.types'

export function useUpdateSchedule() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation<IScheduleModel, IApiError, { id: string; data: IUpdateScheduleInput }>({
    mutationFn: ({ id, data }) => updateScheduleUseCase(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['schedules', id] })
      router.push(`${basePath}/schedules/${id}`)
    },
  })
}
