import { apiClient } from '@/lib/api-client'
import type {
  ScheduleResponseDto,
  PaginatedSchedulesResponseDto,
  CreateScheduleDto,
  UpdateScheduleDto,
} from '@app/shared'
import type { IScheduleListParams } from '../types/schedule-input.types'

export const schedulesService = {
  getAll: (params?: IScheduleListParams): Promise<PaginatedSchedulesResponseDto> => {
    const searchParams = new URLSearchParams()
    if (params?.professionalId) searchParams.set('professionalId', params.professionalId)
    if (params?.dayOfWeek) searchParams.set('dayOfWeek', params.dayOfWeek)
    if (params?.activeOn) searchParams.set('activeOn', params.activeOn)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    const query = searchParams.toString()
    return apiClient.get<PaginatedSchedulesResponseDto>(`/schedules${query ? `?${query}` : ''}`)
  },
  getById: (id: string): Promise<ScheduleResponseDto> =>
    apiClient.get<ScheduleResponseDto>(`/schedules/${id}`),
  create: (data: CreateScheduleDto): Promise<ScheduleResponseDto> =>
    apiClient.post<ScheduleResponseDto>('/schedules', data),
  update: (id: string, data: UpdateScheduleDto): Promise<ScheduleResponseDto> =>
    apiClient.patch<ScheduleResponseDto>(`/schedules/${id}`, data),
  remove: (id: string): Promise<void> => apiClient.delete<void>(`/schedules/${id}`),
}
