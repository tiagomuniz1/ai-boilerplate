import { CouncilType } from '@app/shared'
jest.mock('../use-cases/get-my-professional.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { getMyProfessionalUseCase } from '../use-cases/get-my-professional.use-case'
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

  it('returns the caller own professional profile', async () => {
    const model = makeModel()
    ;(getMyProfessionalUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useMyProfessional(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(model)
    expect(getMyProfessionalUseCase).toHaveBeenCalled()
  })

  // Não ter ficha é resposta válida — quem não exerce simplesmente não emite.
  it('returns null when the caller has no professional profile', async () => {
    ;(getMyProfessionalUseCase as jest.Mock).mockResolvedValue(null)

    const { result } = renderHook(() => useMyProfessional(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeNull()
  })

  it('returns error state on failure', async () => {
    ;(getMyProfessionalUseCase as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useMyProfessional(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

})
