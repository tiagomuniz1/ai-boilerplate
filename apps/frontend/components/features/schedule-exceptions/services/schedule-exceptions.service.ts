import { apiClient } from '@/lib/api-client'
import type {
  PaginatedScheduleExceptionsResponseDto,
  ScheduleExceptionResponseDto,
  CreateScheduleExceptionDto,
  UpdateScheduleExceptionDto,
} from '@app/shared'
import type { IScheduleExceptionListParams } from '../types/schedule-exception-input.types'

export const scheduleExceptionsService = {
  getAll: (params?: IScheduleExceptionListParams): Promise<PaginatedScheduleExceptionsResponseDto> => {
    const sp = new URLSearchParams()
    if (params?.professionalId) sp.set('professionalId', params.professionalId)
    if (params?.from) sp.set('from', params.from)
    if (params?.to) sp.set('to', params.to)
    if (params?.page) sp.set('page', String(params.page))
    if (params?.limit) sp.set('limit', String(params.limit))
    const q = sp.toString()
    return apiClient.get<PaginatedScheduleExceptionsResponseDto>(`/schedule-exceptions${q ? `?${q}` : ''}`)
  },
  create: (data: CreateScheduleExceptionDto): Promise<ScheduleExceptionResponseDto> =>
    apiClient.post<ScheduleExceptionResponseDto>('/schedule-exceptions', data),
  update: (id: string, data: UpdateScheduleExceptionDto): Promise<ScheduleExceptionResponseDto> =>
    apiClient.patch<ScheduleExceptionResponseDto>(`/schedule-exceptions/${id}`, data),
  remove: (id: string): Promise<void> =>
    apiClient.delete<void>(`/schedule-exceptions/${id}`),
}
