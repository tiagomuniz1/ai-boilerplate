import { useQuery } from '@tanstack/react-query'
import { listScheduleRulesUseCase } from '../use-cases/list-schedule-rules.use-case'

export function useScheduleRules(vaccineId?: string) {
  return useQuery({
    queryKey: ['vaccine-schedule-rules', vaccineId],
    queryFn: () => listScheduleRulesUseCase(vaccineId),
  })
}
