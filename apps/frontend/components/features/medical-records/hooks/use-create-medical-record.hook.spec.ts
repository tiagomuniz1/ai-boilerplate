jest.mock('../use-cases/create-medical-record.use-case')

import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { createMedicalRecordUseCase } from '../use-cases/create-medical-record.use-case'
import { useCreateMedicalRecord } from './use-create-medical-record.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ mutations: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Ana',
  professionalId: 'doctor-uuid',
  professionalName: 'Dr. João',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardio',
  schema: [],
  data: {},
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useCreateMedicalRecord', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls createMedicalRecordUseCase with input', async () => {
    ;(createMedicalRecordUseCase as jest.Mock).mockResolvedValue(makeModel())
    const { result } = renderHook(() => useCreateMedicalRecord(), { wrapper })

    const input = { appointmentId: 'appt-uuid', data: { k1: 'val' } }
    await act(async () => { result.current.mutate(input) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect((createMedicalRecordUseCase as jest.Mock).mock.calls[0][0]).toEqual(input)
  })

  it('invalidates by-appointment and patient queries on success', async () => {
    const model = makeModel()
    ;(createMedicalRecordUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useCreateMedicalRecord(), { wrapper })

    await act(async () => { result.current.mutate({ appointmentId: 'appt-uuid', data: {} }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('returns error state on failure', async () => {
    ;(createMedicalRecordUseCase as jest.Mock).mockRejectedValue({ status: 409 })
    const { result } = renderHook(() => useCreateMedicalRecord(), { wrapper })

    await act(async () => { result.current.mutate({ appointmentId: 'appt-uuid', data: {} }) })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
