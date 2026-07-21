jest.mock('../use-cases/get-appointment.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { AppointmentStatus, PatientGender } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { getAppointmentUseCase } from '../use-cases/get-appointment.use-case'
import { useAppointment } from './use-appointment.hook'
import type { IAppointmentDetailModel } from '../types/appointment-model.types'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = (): IAppointmentDetailModel => ({
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
  createdAt: new Date(),
  updatedAt: new Date(),
  patient: {
    fullName: 'Patient',
    email: 'patient@test.com',
    phoneNumber: '11999990000',
    birthDate: new Date('1990-01-01T00:00:00'),
    documentNumber: '12345678901',
    gender: PatientGender.MALE,
  },
})

describe('useAppointment', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns data on success', async () => {
    const model = makeModel()
    ;(getAppointmentUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useAppointment('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(model)
    expect(getAppointmentUseCase).toHaveBeenCalledWith('uuid-1')
  })

  it('returns error state on failure', async () => {
    ;(getAppointmentUseCase as jest.Mock).mockRejectedValue({ status: 404 })

    const { result } = renderHook(() => useAppointment('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
