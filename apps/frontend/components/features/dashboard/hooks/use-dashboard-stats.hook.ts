import { useQuery } from '@tanstack/react-query'
import { getDashboardStatsUseCase } from '../use-cases/get-dashboard-stats.use-case'
import type { IDashboardFilters } from '../types/dashboard.types'

export function useDashboardStats(filters: IDashboardFilters = {}) {
  return useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => getDashboardStatsUseCase(filters),
  })
}
