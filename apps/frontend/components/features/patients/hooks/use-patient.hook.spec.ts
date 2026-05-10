jest.mock('../use-cases/get-patient.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { PatientGender } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { getPatientUseCase } from '../use-cases/get-patient.use-case'
import { usePatient } from './use-patient.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  fullName: 'João Silva',
  email: 'joao@example.com',
  phoneNumber: '(11) 99999-9999',
  birthDate: new Date('1990-05-15'),
  documentNumber: '12345678901',
  gender: PatientGender.MALE,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('usePatient', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls getPatientUseCase with id and returns data on success', async () => {
    const model = makeModel()
    ;(getPatientUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => usePatient('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getPatientUseCase).toHaveBeenCalledWith('uuid-1')
    expect(result.current.data).toEqual(model)
  })

  it('returns error when getPatientUseCase rejects', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Patient not found' }
    ;(getPatientUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => usePatient('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
