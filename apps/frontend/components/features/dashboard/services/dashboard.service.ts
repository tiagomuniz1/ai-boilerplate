import { apiClient } from '@/lib/api-client'
import type { DashboardResponseDto } from '@app/shared'
import type { IDashboardFilters } from '../types/dashboard.types'

export const dashboardService = {
  getStats: (filters: IDashboardFilters = {}): Promise<DashboardResponseDto> => {
    const sp = new URLSearchParams()
    if (filters.from) sp.set('from', filters.from)
    if (filters.to) sp.set('to', filters.to)
    if (filters.doctorId) sp.set('doctorId', filters.doctorId)
    const q = sp.toString()
    return apiClient.get<DashboardResponseDto>(`/dashboard${q ? `?${q}` : ''}`)
  },
}
