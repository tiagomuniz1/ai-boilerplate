jest.mock('../use-cases/delete-exam-result.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { deleteExamResultUseCase } from '../use-cases/delete-exam-result.use-case'
import { useDeleteExamResult } from './use-delete-exam-result.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useDeleteExamResult', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls deleteExamResultUseCase on mutate', async () => {
    ;(deleteExamResultUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useDeleteExamResult('appt-uuid'), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate('result-uuid')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteExamResultUseCase).toHaveBeenCalledWith('result-uuid')
  })

  it('invalidates exam-requests query with appointmentId on success', async () => {
    ;(deleteExamResultUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteExamResult('appt-uuid'), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate('result-uuid')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['exam-requests', 'appt-uuid'] })
  })
})
