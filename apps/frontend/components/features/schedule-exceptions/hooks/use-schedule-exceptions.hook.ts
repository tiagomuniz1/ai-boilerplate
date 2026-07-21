import { useQuery } from '@tanstack/react-query'
import { listScheduleExceptionsUseCase } from '../use-cases/list-schedule-exceptions.use-case'
import type { IScheduleExceptionListParams } from '../types/schedule-exception-input.types'

export function useScheduleExceptions(params?: IScheduleExceptionListParams) {
  return useQuery({
    queryKey: ['schedule-exceptions', params],
    queryFn: () => listScheduleExceptionsUseCase(params),
    enabled: params?.professionalId !== undefined || params?.from !== undefined,
  })
}
