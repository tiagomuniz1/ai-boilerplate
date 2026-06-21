jest.mock('../use-cases/list-templates.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { listTemplatesUseCase } from '../use-cases/list-templates.use-case'
import { useTemplates } from './use-templates.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makePaginated = () => ({
  data: [{ id: 'uuid-1', name: 'Anamnese', specialtyId: 'spec-uuid', specialtyName: 'Cardio', fields: [], isActive: true, createdAt: new Date(), updatedAt: new Date() }],
  total: 1,
  page: 1,
  limit: 20,
})

describe('useTemplates', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns paginated data on success', async () => {
    const paginated = makePaginated()
    ;(listTemplatesUseCase as jest.Mock).mockResolvedValue(paginated)

    const { result } = renderHook(() => useTemplates(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(paginated)
  })

  it('passes params to use-case', async () => {
    ;(listTemplatesUseCase as jest.Mock).mockResolvedValue(makePaginated())

    const { result } = renderHook(() => useTemplates({ page: 2, limit: 10 }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listTemplatesUseCase).toHaveBeenCalledWith({ page: 2, limit: 10 })
  })

  it('returns error state on failure', async () => {
    ;(listTemplatesUseCase as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useTemplates(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
