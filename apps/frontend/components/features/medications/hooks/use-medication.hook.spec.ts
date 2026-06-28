jest.mock('../use-cases/get-medication.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { getMedicationUseCase } from '../use-cases/get-medication.use-case'
import { useMedication } from './use-medication.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('useMedication', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches the medication by id', async () => {
    ;(getMedicationUseCase as jest.Mock).mockResolvedValue({ id: 'm1', name: 'Dipirona' })

    const { result } = renderHook(() => useMedication('m1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getMedicationUseCase).toHaveBeenCalledWith('m1')
  })

  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useMedication(''), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getMedicationUseCase).not.toHaveBeenCalled()
  })
})
