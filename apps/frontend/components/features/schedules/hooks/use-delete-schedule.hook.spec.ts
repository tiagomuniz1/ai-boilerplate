jest.mock('../use-cases/delete-schedule.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { deleteScheduleUseCase } from '../use-cases/delete-schedule.use-case'
import { useDeleteSchedule } from './use-delete-schedule.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useDeleteSchedule', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls deleteScheduleUseCase with given id', async () => {
    ;(deleteScheduleUseCase as jest.Mock).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteSchedule(), { wrapper })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => {
      expect(deleteScheduleUseCase).toHaveBeenCalled()
      const [firstArg] = (deleteScheduleUseCase as jest.Mock).mock.calls[0]
      expect(firstArg).toBe('uuid-1')
    })
  })

  it('returns success state after deletion', async () => {
    ;(deleteScheduleUseCase as jest.Mock).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteSchedule(), { wrapper })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('returns error state on failure', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Schedule not found' }
    ;(deleteScheduleUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useDeleteSchedule(), { wrapper })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
