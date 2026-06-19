jest.mock('../use-cases/delete-schedule-exception.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { deleteScheduleExceptionUseCase } from '../use-cases/delete-schedule-exception.use-case'
import { useDeleteScheduleException } from './use-delete-schedule-exception.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useDeleteScheduleException', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls deleteScheduleExceptionUseCase with the exception id', async () => {
    ;(deleteScheduleExceptionUseCase as jest.Mock).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteScheduleException(), { wrapper })

    act(() => result.current.mutate('exc-uuid'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [firstArg] = (deleteScheduleExceptionUseCase as jest.Mock).mock.calls[0]
    expect(firstArg).toBe('exc-uuid')
  })

  it('invalidates schedule-exceptions and availability queries on success', async () => {
    ;(deleteScheduleExceptionUseCase as jest.Mock).mockResolvedValue(undefined)

    const queryClient = createQueryClient()
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteScheduleException(), {
      wrapper: ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    })

    act(() => result.current.mutate('exc-uuid'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['schedule-exceptions'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['availability'] })
  })

  it('returns error state on failure', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Exception not found' }
    ;(deleteScheduleExceptionUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useDeleteScheduleException(), { wrapper })

    act(() => result.current.mutate('exc-uuid'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(error)
  })
})
