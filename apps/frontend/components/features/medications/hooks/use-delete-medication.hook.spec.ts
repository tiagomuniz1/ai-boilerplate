jest.mock('../use-cases/delete-medication.use-case')

import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { deleteMedicationUseCase } from '../use-cases/delete-medication.use-case'
import { useDeleteMedication } from './use-delete-medication.hook'

let queryClient: QueryClient

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useDeleteMedication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    queryClient = createQueryClient()
    queryClient.setDefaultOptions({ mutations: { retry: false } })
  })

  it('deletes and invalidates the medications list', async () => {
    ;(deleteMedicationUseCase as jest.Mock).mockResolvedValue(undefined)
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteMedication(), { wrapper })

    await act(async () => {
      result.current.mutate('m1')
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(deleteMedicationUseCase).toHaveBeenCalledWith('m1')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['medications'] })
  })
})
