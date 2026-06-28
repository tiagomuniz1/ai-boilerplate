jest.mock('../use-cases/update-medication.use-case')

import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { updateMedicationUseCase } from '../use-cases/update-medication.use-case'
import { useUpdateMedication } from './use-update-medication.hook'

let queryClient: QueryClient

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useUpdateMedication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    queryClient = createQueryClient()
    queryClient.setDefaultOptions({ mutations: { retry: false } })
  })

  it('updates and invalidates the list and the individual medication queries', async () => {
    ;(updateMedicationUseCase as jest.Mock).mockResolvedValue({ id: 'm1' })
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateMedication(), { wrapper })

    await act(async () => {
      result.current.mutate({ id: 'm1', data: { isActive: false } })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(updateMedicationUseCase).toHaveBeenCalledWith('m1', { isActive: false })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['medications'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['medication', 'm1'] })
  })
})
