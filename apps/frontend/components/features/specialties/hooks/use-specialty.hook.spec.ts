jest.mock('../use-cases/get-specialty.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { getSpecialtyUseCase } from '../use-cases/get-specialty.use-case'
import { useSpecialty } from './use-specialty.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  name: 'Cardiologia',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useSpecialty', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns specialty data on success', async () => {
    const model = makeModel()
    ;(getSpecialtyUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useSpecialty('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(model)
    expect(getSpecialtyUseCase).toHaveBeenCalledWith('uuid-1')
  })

  it('returns error state on failure', async () => {
    ;(getSpecialtyUseCase as jest.Mock).mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useSpecialty('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
