jest.mock('../use-cases/list-medications.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { listMedicationsUseCase } from '../use-cases/list-medications.use-case'
import { useMedications } from './use-medications.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('useMedications', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls listMedicationsUseCase with params and exposes data', async () => {
    const page = { data: [{ id: 'm1' }], total: 1, page: 1, limit: 20 }
    ;(listMedicationsUseCase as jest.Mock).mockResolvedValue(page)

    const params = { page: 1, limit: 20, search: 'dipi' }
    const { result } = renderHook(() => useMedications(params), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listMedicationsUseCase).toHaveBeenCalledWith(params)
    expect(result.current.data).toBe(page)
  })
})
