import { CouncilType } from '@app/shared'
jest.mock('../use-cases/list-professionals.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { listProfessionalsUseCase } from '../use-cases/list-professionals.use-case'
import { useMyProfessional } from './use-my-professional.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
  registrations: [{ id: 'reg-uuid-1', councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia', registryNumber: null }],
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useMyProfessional', () => {
  beforeEach(() => jest.clearAllMocks())

  it('unwraps the first (and only) professional returned for the current user', async () => {
    const model = makeModel()
    ;(listProfessionalsUseCase as jest.Mock).mockResolvedValue([model])

    const { result } = renderHook(() => useMyProfessional(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(model)
    expect(listProfessionalsUseCase).toHaveBeenCalledWith()
  })

  it('returns undefined data when the list is empty', async () => {
    ;(listProfessionalsUseCase as jest.Mock).mockResolvedValue([])

    const { result } = renderHook(() => useMyProfessional(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeUndefined()
  })

  it('returns error state on failure', async () => {
    ;(listProfessionalsUseCase as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useMyProfessional(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('does not fetch when enabled is false', async () => {
    const { result } = renderHook(() => useMyProfessional({ enabled: false }), { wrapper })

    expect(result.current.isFetching).toBe(false)
    expect(listProfessionalsUseCase).not.toHaveBeenCalled()
  })
})
