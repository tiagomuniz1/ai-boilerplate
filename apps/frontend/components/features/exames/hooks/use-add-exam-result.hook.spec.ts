jest.mock('../use-cases/add-exam-result.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { addExamResultUseCase } from '../use-cases/add-exam-result.use-case'
import { useAddExamResult } from './use-add-exam-result.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useAddExamResult', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls addExamResultUseCase with examRequestId and files', async () => {
    const updated = { id: 'exam-uuid', appointmentId: 'appt-uuid' }
    ;(addExamResultUseCase as jest.Mock).mockResolvedValue(updated)
    const files = [new File(['a'], 'hemograma.pdf', { type: 'application/pdf' })]

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useAddExamResult('appt-uuid'), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ examRequestId: 'exam-uuid', files })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(addExamResultUseCase).toHaveBeenCalledWith('exam-uuid', files)
  })

  it('invalidates exam-requests query with appointmentId on success', async () => {
    ;(addExamResultUseCase as jest.Mock).mockResolvedValue({ id: 'exam-uuid' })

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useAddExamResult('appt-uuid'), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ examRequestId: 'exam-uuid', files: [] })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['exam-requests', 'appt-uuid'] })
  })

  it('exposes error state when use-case throws', async () => {
    ;(addExamResultUseCase as jest.Mock).mockRejectedValue({ status: 422 })

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useAddExamResult('appt-uuid'), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ examRequestId: 'exam-uuid', files: [] })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
