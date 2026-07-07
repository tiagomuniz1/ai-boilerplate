jest.mock('../use-cases/get-doctor.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { getDoctorUseCase } from '../use-cases/get-doctor.use-case'
import { useDoctor } from './use-doctor.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
  crms: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia', rqe: null }],
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useDoctor', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns doctor data on success', async () => {
    const model = makeModel()
    ;(getDoctorUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useDoctor('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(model)
    expect(getDoctorUseCase).toHaveBeenCalledWith('uuid-1')
  })

  it('returns error state on failure', async () => {
    ;(getDoctorUseCase as jest.Mock).mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useDoctor('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
