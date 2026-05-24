import { useQuery } from '@tanstack/react-query'
import { listSchedulesUseCase } from '../use-cases/list-schedules.use-case'
import type { IScheduleListParams } from '../types/schedule-input.types'

export function useSchedules(params?: IScheduleListParams) {
  return useQuery({
    queryKey: ['schedules', params],
    queryFn: () => listSchedulesUseCase(params),
  })
}
