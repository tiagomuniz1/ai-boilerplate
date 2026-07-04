jest.mock('../use-cases/create-exam-request.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createExamRequestUseCase } from '../use-cases/create-exam-request.use-case'
import { useCreateExamRequest } from './use-create-exam-request.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useCreateExamRequest', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls createExamRequestUseCase on mutate', async () => {
    const created = { id: 'exam-uuid', appointmentId: 'appt-uuid' }
    ;(createExamRequestUseCase as jest.Mock).mockResolvedValue(created)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useCreateExamRequest(), { wrapper: makeWrapper(client) })

    const input = { appointmentId: 'appt-uuid', items: [{ name: 'Hemograma' }] }
    await act(async () => {
      result.current.mutate(input)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(createExamRequestUseCase).toHaveBeenCalled()
    expect((createExamRequestUseCase as jest.Mock).mock.calls[0][0]).toBe(input)
  })

  it('invalidates exam-requests query with the appointmentId on success', async () => {
    const created = { id: 'exam-uuid', appointmentId: 'appt-uuid' }
    ;(createExamRequestUseCase as jest.Mock).mockResolvedValue(created)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useCreateExamRequest(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ appointmentId: 'appt-uuid', items: [{ name: 'Hemograma' }] })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['exam-requests', 'appt-uuid'] })
  })
})
