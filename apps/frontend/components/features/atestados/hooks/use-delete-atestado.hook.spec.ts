jest.mock('../use-cases/delete-atestado.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { deleteAtestadoUseCase } from '../use-cases/delete-atestado.use-case'
import { useDeleteAtestado } from './use-delete-atestado.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useDeleteAtestado', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls deleteAtestadoUseCase on mutate', async () => {
    ;(deleteAtestadoUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useDeleteAtestado('appt-uuid'), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate('cert-uuid')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteAtestadoUseCase).toHaveBeenCalledWith('cert-uuid')
  })

  it('invalidates atestados query with appointmentId on success', async () => {
    ;(deleteAtestadoUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteAtestado('appt-uuid'), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate('cert-uuid')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['atestados', 'appt-uuid'] })
  })
})
