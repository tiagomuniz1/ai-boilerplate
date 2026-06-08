jest.mock('../use-cases/get-clinic.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { getClinicUseCase } from '../use-cases/get-clinic.use-case'
import { useClinic } from './use-clinic.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useClinic', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns clinic data on success', async () => {
    const model = makeModel()
    ;(getClinicUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useClinic('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(model)
    expect(getClinicUseCase).toHaveBeenCalledWith('uuid-1')
  })

  it('returns error state on failure', async () => {
    ;(getClinicUseCase as jest.Mock).mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useClinic('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
