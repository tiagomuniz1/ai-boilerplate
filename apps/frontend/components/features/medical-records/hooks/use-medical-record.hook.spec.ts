jest.mock('../use-cases/get-medical-record.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { getMedicalRecordUseCase } from '../use-cases/get-medical-record.use-case'
import { useMedicalRecord } from './use-medical-record.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Ana',
  doctorId: 'doctor-uuid',
  doctorName: 'Dr. João',
  schema: [],
  data: {},
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useMedicalRecord', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns medical record on success', async () => {
    const model = makeModel()
    ;(getMedicalRecordUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useMedicalRecord('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(model)
    expect(getMedicalRecordUseCase).toHaveBeenCalledWith('uuid-1')
  })

  it('does not fetch when id is empty', async () => {
    const { result } = renderHook(() => useMedicalRecord(''), { wrapper })

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(getMedicalRecordUseCase).not.toHaveBeenCalled()
  })

  it('returns error state on failure', async () => {
    ;(getMedicalRecordUseCase as jest.Mock).mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useMedicalRecord('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
