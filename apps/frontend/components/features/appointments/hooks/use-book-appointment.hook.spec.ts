jest.mock('../use-cases/book-appointment.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { AppointmentStatus } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { bookAppointmentUseCase } from '../use-cases/book-appointment.use-case'
import { useBookAppointment } from './use-book-appointment.hook'
import type { IAppointmentModel } from '../types/appointment-model.types'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const makeInput = () => ({
  patientId: 'pat-uuid',
  date: '2025-06-20',
  startTime: '08:00',
})

const makeModel = (): IAppointmentModel => ({
  id: 'uuid-1',
  professionalId: 'doc-uuid',
  professionalName: 'Dr. Test',
  patientId: 'pat-uuid',
  patientName: 'Patient',
  specialtyId: null,
  specialtyName: null,
  scheduleId: 'sched-uuid',
  date: '2025-06-20',
  startTime: '08:00',
  endTime: '08:30',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  seriesId: null,
  seriesSequence: null,
  seriesTotalOccurrences: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useBookAppointment', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls bookAppointmentUseCase with input', async () => {
    ;(bookAppointmentUseCase as jest.Mock).mockResolvedValue(makeModel())

    const { result } = renderHook(() => useBookAppointment(), { wrapper })

    act(() => result.current.mutate(makeInput()))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(bookAppointmentUseCase).toHaveBeenCalled()
    const [firstArg] = (bookAppointmentUseCase as jest.Mock).mock.calls[0]
    expect(firstArg).toEqual(makeInput())
  })

  it('invalidates appointments, availability and dashboard queries on success', async () => {
    ;(bookAppointmentUseCase as jest.Mock).mockResolvedValue(makeModel())

    const queryClient = createQueryClient()
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useBookAppointment(), {
      wrapper: ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    })

    act(() => result.current.mutate(makeInput()))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['appointments'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['availability'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
  })

  it('returns error state on failure', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'Slot already booked' }
    ;(bookAppointmentUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useBookAppointment(), { wrapper })

    act(() => result.current.mutate(makeInput()))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(error)
  })
})
