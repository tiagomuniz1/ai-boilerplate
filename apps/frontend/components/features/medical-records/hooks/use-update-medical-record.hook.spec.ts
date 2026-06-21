jest.mock('../use-cases/update-medical-record.use-case')

import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { updateMedicalRecordUseCase } from '../use-cases/update-medical-record.use-case'
import { useUpdateMedicalRecord } from './use-update-medical-record.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ mutations: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  schema: [],
  data: {},
  notes: 'Obs',
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useUpdateMedicalRecord', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls updateMedicalRecordUseCase with id and data', async () => {
    ;(updateMedicalRecordUseCase as jest.Mock).mockResolvedValue(makeModel())
    const { result } = renderHook(() => useUpdateMedicalRecord(), { wrapper })

    const payload = { id: 'uuid-1', data: { notes: 'Nova obs' } }
    await act(async () => { result.current.mutate(payload) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(updateMedicalRecordUseCase).toHaveBeenCalledWith('uuid-1', { notes: 'Nova obs' })
  })

  it('returns error state on failure', async () => {
    ;(updateMedicalRecordUseCase as jest.Mock).mockRejectedValue({ status: 422 })
    const { result } = renderHook(() => useUpdateMedicalRecord(), { wrapper })

    await act(async () => { result.current.mutate({ id: 'uuid-1', data: {} }) })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
