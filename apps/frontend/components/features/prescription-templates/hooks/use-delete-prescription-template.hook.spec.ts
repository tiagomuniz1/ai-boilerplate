jest.mock('../use-cases/delete-prescription-template.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { deletePrescriptionTemplateUseCase } from '../use-cases/delete-prescription-template.use-case'
import { useDeletePrescriptionTemplate } from './use-delete-prescription-template.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useDeletePrescriptionTemplate', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls deletePrescriptionTemplateUseCase on mutate', async () => {
    ;(deletePrescriptionTemplateUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useDeletePrescriptionTemplate(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate('tpl-uuid')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deletePrescriptionTemplateUseCase).toHaveBeenCalledWith('tpl-uuid')
  })

  it('invalidates prescription-templates query on success', async () => {
    ;(deletePrescriptionTemplateUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useDeletePrescriptionTemplate(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate('tpl-uuid')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['prescription-templates'] })
  })
})
