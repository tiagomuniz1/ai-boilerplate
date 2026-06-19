jest.mock('../use-cases/complete-appointment.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { AppointmentStatus } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { completeAppointmentUseCase } from '../use-cases/complete-appointment.use-case'
import { useCompleteAppointment } from './use-complete-appointment.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  status: AppointmentStatus.COMPLETED,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useCompleteAppointment', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls completeAppointmentUseCase with id', async () => {
    ;(completeAppointmentUseCase as jest.Mock).mockResolvedValue(makeModel())

    const { result } = renderHook(() => useCompleteAppointment(), { wrapper })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(completeAppointmentUseCase).toHaveBeenCalled()
    const [firstArg] = (completeAppointmentUseCase as jest.Mock).mock.calls[0]
    expect(firstArg).toBe('uuid-1')
  })

  it('invalidates appointments and availability on success', async () => {
    ;(completeAppointmentUseCase as jest.Mock).mockResolvedValue(makeModel())

    const queryClient = createQueryClient()
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCompleteAppointment(), {
      wrapper: ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['appointments'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['availability'] })
  })

  it('returns error state on failure', async () => {
    const error = { status: 422, title: 'Unprocessable Entity' }
    ;(completeAppointmentUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useCompleteAppointment(), { wrapper })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(error)
  })
})
