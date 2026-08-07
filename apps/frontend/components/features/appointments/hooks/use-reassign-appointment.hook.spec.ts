jest.mock('../use-cases/reassign-appointment.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { reassignAppointmentUseCase } from '../use-cases/reassign-appointment.use-case'
import { useReassignAppointment } from './use-reassign-appointment.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useReassignAppointment', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls reassignAppointmentUseCase with id and professionalId', async () => {
    ;(reassignAppointmentUseCase as jest.Mock).mockResolvedValue({ id: 'apt-1' })

    const { result } = renderHook(() => useReassignAppointment(), { wrapper })

    act(() => result.current.mutate({ id: 'apt-1', professionalId: 'doc-2' }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(reassignAppointmentUseCase).toHaveBeenCalledWith('apt-1', 'doc-2')
  })

  it('invalidates appointments, availability and dashboard on success', async () => {
    ;(reassignAppointmentUseCase as jest.Mock).mockResolvedValue({ id: 'apt-1' })

    const queryClient = createQueryClient()
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useReassignAppointment(), {
      wrapper: ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    })

    act(() => result.current.mutate({ id: 'apt-1', professionalId: 'doc-2' }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['appointments'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['availability'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
  })

  it('returns error state on failure', async () => {
    const error = { status: 422, title: 'Unprocessable Entity' }
    ;(reassignAppointmentUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useReassignAppointment(), { wrapper })

    act(() => result.current.mutate({ id: 'apt-1', professionalId: 'doc-2' }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(error)
  })
})
