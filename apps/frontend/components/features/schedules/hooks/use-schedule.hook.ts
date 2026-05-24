import { useQuery } from '@tanstack/react-query'
import { getScheduleUseCase } from '../use-cases/get-schedule.use-case'

export function useSchedule(id: string) {
  return useQuery({
    queryKey: ['schedules', id],
    queryFn: () => getScheduleUseCase(id),
    enabled: !!id,
  })
}
