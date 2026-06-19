jest.mock('../use-cases/list-appointments.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { AppointmentStatus } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { listAppointmentsUseCase } from '../use-cases/list-appointments.use-case'
import { useAppointments } from './use-appointments.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeResult = () => ({ data: [], total: 0, page: 1, limit: 20 })

describe('useAppointments', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns data on success', async () => {
    ;(listAppointmentsUseCase as jest.Mock).mockResolvedValue(makeResult())
    const { result } = renderHook(() => useAppointments(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(makeResult())
  })

  it('passes params to listAppointmentsUseCase', async () => {
    ;(listAppointmentsUseCase as jest.Mock).mockResolvedValue(makeResult())
    const params = { doctorId: 'doc-uuid', status: AppointmentStatus.SCHEDULED }
    renderHook(() => useAppointments(params), { wrapper })
    await waitFor(() => expect(listAppointmentsUseCase).toHaveBeenCalled())
    expect(listAppointmentsUseCase).toHaveBeenCalledWith(params)
  })

  it('returns error state on failure', async () => {
    ;(listAppointmentsUseCase as jest.Mock).mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useAppointments(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
