jest.mock('../use-cases/get-dashboard-stats.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getDashboardStatsUseCase } from '../use-cases/get-dashboard-stats.use-case'
import { useDashboardStats } from './use-dashboard-stats.hook'
import type { IDashboardModel } from '../types/dashboard.types'

const mockUseCase = getDashboardStatsUseCase as jest.MockedFunction<typeof getDashboardStatsUseCase>

const fakeModel = { kpi: { scheduled: 3 } } as unknown as IDashboardModel

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('useDashboardStats', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns data from use-case', async () => {
    mockUseCase.mockResolvedValue(fakeModel)
    const { result } = renderHook(() => useDashboardStats(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(fakeModel)
  })

  it('includes filters in the query call', async () => {
    mockUseCase.mockResolvedValue(fakeModel)
    const { result } = renderHook(
      () => useDashboardStats({ from: '2026-01-01', to: '2026-01-31' }),
      { wrapper: createWrapper() },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUseCase).toHaveBeenCalledWith({ from: '2026-01-01', to: '2026-01-31' })
  })

  it('reflects error state when use-case throws', async () => {
    mockUseCase.mockRejectedValue(new Error('api error'))
    const { result } = renderHook(() => useDashboardStats(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
