jest.mock('../use-cases/create-prescription-template.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createPrescriptionTemplateUseCase } from '../use-cases/create-prescription-template.use-case'
import { useCreatePrescriptionTemplate } from './use-create-prescription-template.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useCreatePrescriptionTemplate', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls createPrescriptionTemplateUseCase on mutate', async () => {
    const model = { id: 'tpl-uuid' }
    ;(createPrescriptionTemplateUseCase as jest.Mock).mockResolvedValue(model)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useCreatePrescriptionTemplate(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ name: 'Modelo A', items: [{ medicationId: 'm1', instructions: 'Tomar 1 cp' }] })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(createPrescriptionTemplateUseCase).toHaveBeenCalled()
  })

  it('invalidates prescription-templates query on success', async () => {
    const model = { id: 'tpl-uuid' }
    ;(createPrescriptionTemplateUseCase as jest.Mock).mockResolvedValue(model)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useCreatePrescriptionTemplate(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ name: 'Modelo A', items: [{ medicationId: 'm1', instructions: 'Tomar 1 cp' }] })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['prescription-templates'] })
  })
})
