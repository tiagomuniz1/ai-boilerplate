jest.mock('../use-cases/create-prescription.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createPrescriptionUseCase } from '../use-cases/create-prescription.use-case'
import { useCreatePrescription } from './use-create-prescription.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useCreatePrescription', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls createPrescriptionUseCase on mutate', async () => {
    const model = { id: 'rx-uuid', appointmentId: 'appt-uuid' }
    ;(createPrescriptionUseCase as jest.Mock).mockResolvedValue(model)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useCreatePrescription(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ appointmentId: 'appt-uuid', items: [{ medicationId: 'm1', instructions: 'Tomar 1 cp' }] })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(createPrescriptionUseCase).toHaveBeenCalled()
  })

  it('invalidates prescriptions query on success', async () => {
    const model = { id: 'rx-uuid', appointmentId: 'appt-uuid' }
    ;(createPrescriptionUseCase as jest.Mock).mockResolvedValue(model)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useCreatePrescription(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ appointmentId: 'appt-uuid', items: [{ medicationId: 'm1', instructions: 'Tomar 1 cp' }] })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['prescriptions', 'appt-uuid'] })
  })
})
