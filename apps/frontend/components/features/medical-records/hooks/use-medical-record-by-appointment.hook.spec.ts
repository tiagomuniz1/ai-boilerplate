jest.mock('../use-cases/get-medical-record-by-appointment.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { getMedicalRecordByAppointmentUseCase } from '../use-cases/get-medical-record-by-appointment.use-case'
import { useMedicalRecordByAppointment } from './use-medical-record-by-appointment.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('useMedicalRecordByAppointment', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns medical record on success', async () => {
    const model = { id: 'uuid-1', appointmentId: 'appt-uuid' }
    ;(getMedicalRecordByAppointmentUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useMedicalRecordByAppointment('appt-uuid'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(model)
    expect(getMedicalRecordByAppointmentUseCase).toHaveBeenCalledWith('appt-uuid')
  })

  it('returns null when no record exists', async () => {
    ;(getMedicalRecordByAppointmentUseCase as jest.Mock).mockResolvedValue(null)

    const { result } = renderHook(() => useMedicalRecordByAppointment('appt-uuid'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('does not fetch when appointmentId is empty', async () => {
    const { result } = renderHook(() => useMedicalRecordByAppointment(''), { wrapper })

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(getMedicalRecordByAppointmentUseCase).not.toHaveBeenCalled()
  })

  it('returns error state on failure', async () => {
    ;(getMedicalRecordByAppointmentUseCase as jest.Mock).mockRejectedValue(new Error('error'))

    const { result } = renderHook(() => useMedicalRecordByAppointment('appt-uuid'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
