import { dashboardService } from '../services/dashboard.service'
import { toDashboardModel } from '../mappers/to-dashboard-model'
import type { IDashboardFilters, IDashboardModel } from '../types/dashboard.types'

export async function getDashboardStatsUseCase(filters: IDashboardFilters = {}): Promise<IDashboardModel> {
  const dto = await dashboardService.getStats(filters)
  return toDashboardModel(dto)
}
