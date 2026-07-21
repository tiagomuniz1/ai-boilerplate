jest.mock('../use-cases/list-professionals.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { listProfessionalsUseCase } from '../use-cases/list-professionals.use-case'
import { useProfessionals } from './use-professionals.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
  registrations: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia', registryNumber: null }],
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useProfessionals', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns professionals data on success', async () => {
    const model = makeModel()
    ;(listProfessionalsUseCase as jest.Mock).mockResolvedValue([model])

    const { result } = renderHook(() => useProfessionals(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([model])
  })

  it('passes params to listProfessionalsUseCase', async () => {
    ;(listProfessionalsUseCase as jest.Mock).mockResolvedValue([])

    const params = { search: 'Cardio', page: 1, limit: 20 }
    const { result } = renderHook(() => useProfessionals(params), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(listProfessionalsUseCase).toHaveBeenCalledWith(params)
  })

  it('returns error state on failure', async () => {
    ;(listProfessionalsUseCase as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useProfessionals(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
