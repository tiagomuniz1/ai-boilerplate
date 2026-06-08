jest.mock('../use-cases/list-clinics.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { listClinicsUseCase } from '../use-cases/list-clinics.use-case'
import { useClinics } from './use-clinics.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makePaginated = () => ({
  data: [
    {
      id: 'uuid-1',
      name: 'Clínica do Coração',
      slug: 'clinica-do-coracao',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
})

describe('useClinics', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns paginated clinics data on success', async () => {
    const paginated = makePaginated()
    ;(listClinicsUseCase as jest.Mock).mockResolvedValue(paginated)

    const { result } = renderHook(() => useClinics(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(paginated)
  })

  it('passes params to listClinicsUseCase', async () => {
    ;(listClinicsUseCase as jest.Mock).mockResolvedValue(makePaginated())

    const params = { search: 'coracao', page: 1, limit: 20 }
    const { result } = renderHook(() => useClinics(params), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(listClinicsUseCase).toHaveBeenCalledWith(params)
  })

  it('returns error state on failure', async () => {
    ;(listClinicsUseCase as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useClinics(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
