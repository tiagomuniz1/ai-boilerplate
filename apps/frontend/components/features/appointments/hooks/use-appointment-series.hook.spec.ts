jest.mock('../use-cases/get-appointment-series.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { getAppointmentSeriesUseCase } from '../use-cases/get-appointment-series.use-case'
import { useAppointmentSeries } from './use-appointment-series.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('useAppointmentSeries', () => {
  beforeEach(() => jest.clearAllMocks())

  it('does not fetch without a series id', () => {
    renderHook(() => useAppointmentSeries(null), { wrapper })

    expect(getAppointmentSeriesUseCase).not.toHaveBeenCalled()
  })

  it('fetches the series when an id is supplied', async () => {
    const model = { id: 'series-uuid', occurrences: [] }
    ;(getAppointmentSeriesUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useAppointmentSeries('series-uuid'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getAppointmentSeriesUseCase).toHaveBeenCalledWith('series-uuid')
    expect(result.current.data).toBe(model)
  })

  it('exposes the error state on failure', async () => {
    ;(getAppointmentSeriesUseCase as jest.Mock).mockRejectedValue({ status: 404 })

    const { result } = renderHook(() => useAppointmentSeries('series-uuid'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
