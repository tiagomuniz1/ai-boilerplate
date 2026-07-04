jest.mock('../use-cases/list-exam-requests.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { listExamRequestsUseCase } from '../use-cases/list-exam-requests.use-case'
import { useExamRequests } from './use-exam-requests.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('useExamRequests', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls listExamRequestsUseCase with appointmentId and exposes data', async () => {
    const models = [{ id: 'exam-1' }]
    ;(listExamRequestsUseCase as jest.Mock).mockResolvedValue(models)

    const { result } = renderHook(() => useExamRequests('appt-uuid'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listExamRequestsUseCase).toHaveBeenCalledWith('appt-uuid')
    expect(result.current.data).toBe(models)
  })

  it('exposes error state when use-case throws', async () => {
    ;(listExamRequestsUseCase as jest.Mock).mockRejectedValue(new Error('fetch error'))

    const { result } = renderHook(() => useExamRequests('appt-uuid'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
