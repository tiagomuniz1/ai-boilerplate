jest.mock('../use-cases/cancel-appointment.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { AppointmentStatus } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { cancelAppointmentUseCase } from '../use-cases/cancel-appointment.use-case'
import { useCancelAppointment } from './use-cancel-appointment.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  status: AppointmentStatus.CANCELLED,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useCancelAppointment', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls cancelAppointmentUseCase with id and data', async () => {
    ;(cancelAppointmentUseCase as jest.Mock).mockResolvedValue(makeModel())

    const { result } = renderHook(() => useCancelAppointment(), { wrapper })

    act(() => result.current.mutate({ id: 'uuid-1', data: { cancellationReason: 'reason' } }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(cancelAppointmentUseCase).toHaveBeenCalledWith('uuid-1', { cancellationReason: 'reason' })
  })

  it('invalidates appointments, availability and dashboard on success', async () => {
    ;(cancelAppointmentUseCase as jest.Mock).mockResolvedValue(makeModel())

    const queryClient = createQueryClient()
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCancelAppointment(), {
      wrapper: ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    })

    act(() => result.current.mutate({ id: 'uuid-1', data: {} }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['appointments'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['availability'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
  })

  it('returns error state on failure', async () => {
    const error = { status: 422, title: 'Unprocessable Entity' }
    ;(cancelAppointmentUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useCancelAppointment(), { wrapper })

    act(() => result.current.mutate({ id: 'uuid-1', data: {} }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(error)
  })
})
