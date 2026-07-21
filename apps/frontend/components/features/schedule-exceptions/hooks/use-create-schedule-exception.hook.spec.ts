jest.mock('../use-cases/create-schedule-exception.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { createScheduleExceptionUseCase } from '../use-cases/create-schedule-exception.use-case'
import { useCreateScheduleException } from './use-create-schedule-exception.hook'
import type { IScheduleExceptionModel } from '../types/schedule-exception-model.types'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const makeInput = () => ({ date: '2099-06-20', startTime: '08:00', endTime: '12:00' })

const makeModel = (): IScheduleExceptionModel => ({
  id: 'exc-uuid',
  professionalId: 'doc-uuid',
  date: '2099-06-20',
  startTime: '08:00',
  endTime: '12:00',
  reason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useCreateScheduleException', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls createScheduleExceptionUseCase with input', async () => {
    ;(createScheduleExceptionUseCase as jest.Mock).mockResolvedValue(makeModel())

    const { result } = renderHook(() => useCreateScheduleException(), { wrapper })

    act(() => result.current.mutate(makeInput()))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [firstArg] = (createScheduleExceptionUseCase as jest.Mock).mock.calls[0]
    expect(firstArg).toEqual(makeInput())
  })

  it('invalidates schedule-exceptions and availability queries on success', async () => {
    ;(createScheduleExceptionUseCase as jest.Mock).mockResolvedValue(makeModel())

    const queryClient = createQueryClient()
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateScheduleException(), {
      wrapper: ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    })

    act(() => result.current.mutate(makeInput()))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['schedule-exceptions'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['availability'] })
  })

  it('returns error state on failure', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'Appointments exist in this period' }
    ;(createScheduleExceptionUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useCreateScheduleException(), { wrapper })

    act(() => result.current.mutate(makeInput()))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(error)
  })
})
