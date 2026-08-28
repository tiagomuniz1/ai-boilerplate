jest.mock('../use-cases/book-recurring-appointments.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RecurrenceInterval } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { bookRecurringAppointmentsUseCase } from '../use-cases/book-recurring-appointments.use-case'
import { useBookRecurringAppointments } from './use-book-recurring-appointments.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const makeInput = () => ({
  patientId: 'pat-uuid',
  startTime: '09:00',
  recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
  dates: ['2099-06-16', '2099-06-23'],
  occurrenceCount: 2,
})

const makeResult = () => ({
  seriesId: 'series-uuid',
  createdOccurrenceCount: 2,
  appointments: [],
})

describe('useBookRecurringAppointments', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls bookRecurringAppointmentsUseCase with the input', async () => {
    ;(bookRecurringAppointmentsUseCase as jest.Mock).mockResolvedValue(makeResult())

    const { result } = renderHook(() => useBookRecurringAppointments(), { wrapper })

    act(() => result.current.mutate(makeInput()))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [firstArg] = (bookRecurringAppointmentsUseCase as jest.Mock).mock.calls[0]
    expect(firstArg).toEqual(makeInput())
  })

  it('invalidates appointments, availability and dashboard on success', async () => {
    ;(bookRecurringAppointmentsUseCase as jest.Mock).mockResolvedValue(makeResult())

    const queryClient = createQueryClient()
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useBookRecurringAppointments(), {
      wrapper: ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    })

    act(() => result.current.mutate(makeInput()))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['appointments'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['availability'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
  })

  it('returns the error state when the dates are no longer available', async () => {
    const error = { status: 409, conflictingOccurrences: [{ date: '2099-06-23' }] }
    ;(bookRecurringAppointmentsUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useBookRecurringAppointments(), { wrapper })

    act(() => result.current.mutate(makeInput()))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(error)
  })
})
