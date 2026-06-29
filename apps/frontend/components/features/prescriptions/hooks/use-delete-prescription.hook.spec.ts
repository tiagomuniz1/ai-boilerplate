jest.mock('../use-cases/delete-prescription.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { deletePrescriptionUseCase } from '../use-cases/delete-prescription.use-case'
import { useDeletePrescription } from './use-delete-prescription.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useDeletePrescription', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls deletePrescriptionUseCase on mutate', async () => {
    ;(deletePrescriptionUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useDeletePrescription('appt-uuid'), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate('rx-uuid')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deletePrescriptionUseCase).toHaveBeenCalledWith('rx-uuid')
  })

  it('invalidates prescriptions query with appointmentId on success', async () => {
    ;(deletePrescriptionUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useDeletePrescription('appt-uuid'), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate('rx-uuid')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['prescriptions', 'appt-uuid'] })
  })
})
