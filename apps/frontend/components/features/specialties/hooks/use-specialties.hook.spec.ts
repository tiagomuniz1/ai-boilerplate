jest.mock('../use-cases/list-specialties.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { listSpecialtiesUseCase } from '../use-cases/list-specialties.use-case'
import { useSpecialties } from './use-specialties.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makePaginated = () => ({
  data: [{ id: 'uuid-1', name: 'Cardiologia', description: null, createdAt: new Date(), updatedAt: new Date() }],
  total: 1,
  page: 1,
  limit: 20,
})

describe('useSpecialties', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns paginated specialties data on success', async () => {
    const paginated = makePaginated()
    ;(listSpecialtiesUseCase as jest.Mock).mockResolvedValue(paginated)

    const { result } = renderHook(() => useSpecialties(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(paginated)
  })

  it('passes params to listSpecialtiesUseCase', async () => {
    ;(listSpecialtiesUseCase as jest.Mock).mockResolvedValue(makePaginated())

    const params = { search: 'Cardio', page: 1, limit: 20 }
    const { result } = renderHook(() => useSpecialties(params), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(listSpecialtiesUseCase).toHaveBeenCalledWith(params)
  })

  it('returns error state on failure', async () => {
    ;(listSpecialtiesUseCase as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useSpecialties(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
