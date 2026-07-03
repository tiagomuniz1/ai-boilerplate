jest.mock('../use-cases/create-atestado.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAtestadoUseCase } from '../use-cases/create-atestado.use-case'
import { useCreateAtestado } from './use-create-atestado.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useCreateAtestado', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls createAtestadoUseCase on mutate', async () => {
    const model = { id: 'cert-uuid', appointmentId: 'appt-uuid' }
    ;(createAtestadoUseCase as jest.Mock).mockResolvedValue(model)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useCreateAtestado(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ appointmentId: 'appt-uuid', type: 'leave', daysOff: 3, startDate: '2026-01-05' } as any)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(createAtestadoUseCase).toHaveBeenCalled()
  })

  it('invalidates atestados query on success', async () => {
    const model = { id: 'cert-uuid', appointmentId: 'appt-uuid' }
    ;(createAtestadoUseCase as jest.Mock).mockResolvedValue(model)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useCreateAtestado(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ appointmentId: 'appt-uuid', type: 'leave', daysOff: 3, startDate: '2026-01-05' } as any)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['atestados', 'appt-uuid'] })
  })
})
