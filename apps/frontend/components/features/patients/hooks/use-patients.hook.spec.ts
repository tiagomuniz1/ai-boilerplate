jest.mock('../use-cases/list-patients.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { PatientGender } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { listPatientsUseCase } from '../use-cases/list-patients.use-case'
import { usePatients } from './use-patients.hook'

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

describe('usePatients', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns data from listPatientsUseCase on success', async () => {
    const models = [makeModel()]
    ;(listPatientsUseCase as jest.Mock).mockResolvedValue(models)

    const { result } = renderHook(() => usePatients(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(models)
  })

  it('calls listPatientsUseCase with params when provided', async () => {
    const params = { search: 'João' }
    ;(listPatientsUseCase as jest.Mock).mockResolvedValue([])

    const { result } = renderHook(() => usePatients(params), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(listPatientsUseCase).toHaveBeenCalledWith(params)
  })

  it('returns error when listPatientsUseCase rejects', async () => {
    const error = { status: 500, title: 'Internal Error', detail: 'Server error' }
    ;(listPatientsUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => usePatients(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
