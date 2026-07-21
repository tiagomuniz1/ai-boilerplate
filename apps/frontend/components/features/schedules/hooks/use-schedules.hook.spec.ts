jest.mock('../use-cases/list-schedules.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { DayOfWeek } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { listSchedulesUseCase } from '../use-cases/list-schedules.use-case'
import { useSchedules } from './use-schedules.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeResult = () => ({ data: [], total: 0, page: 1, limit: 20 })

describe('useSchedules', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns data on success', async () => {
    ;(listSchedulesUseCase as jest.Mock).mockResolvedValue(makeResult())

    const { result } = renderHook(() => useSchedules(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(makeResult())
  })

  it('passes params to listSchedulesUseCase', async () => {
    ;(listSchedulesUseCase as jest.Mock).mockResolvedValue(makeResult())

    const params = { dayOfWeek: DayOfWeek.MONDAY, page: 1 }
    const { result } = renderHook(() => useSchedules(params), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(listSchedulesUseCase).toHaveBeenCalledWith(params)
  })

  it('includes params in queryKey', async () => {
    ;(listSchedulesUseCase as jest.Mock).mockResolvedValue(makeResult())

    const params = { professionalId: 'doc-uuid' }
    renderHook(() => useSchedules(params), { wrapper })

    await waitFor(() => expect(listSchedulesUseCase).toHaveBeenCalled())
  })

  it('returns error state on failure', async () => {
    ;(listSchedulesUseCase as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useSchedules(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
