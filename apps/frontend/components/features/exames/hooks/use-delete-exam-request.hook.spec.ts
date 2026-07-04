jest.mock('../use-cases/delete-exam-request.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { deleteExamRequestUseCase } from '../use-cases/delete-exam-request.use-case'
import { useDeleteExamRequest } from './use-delete-exam-request.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useDeleteExamRequest', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls deleteExamRequestUseCase on mutate', async () => {
    ;(deleteExamRequestUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useDeleteExamRequest('appt-uuid'), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate('exam-uuid')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteExamRequestUseCase).toHaveBeenCalledWith('exam-uuid')
  })

  it('invalidates exam-requests query with appointmentId on success', async () => {
    ;(deleteExamRequestUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteExamRequest('appt-uuid'), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate('exam-uuid')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['exam-requests', 'appt-uuid'] })
  })
})
