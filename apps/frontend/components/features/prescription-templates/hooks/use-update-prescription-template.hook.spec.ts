jest.mock('../use-cases/update-prescription-template.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { updatePrescriptionTemplateUseCase } from '../use-cases/update-prescription-template.use-case'
import { useUpdatePrescriptionTemplate } from './use-update-prescription-template.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useUpdatePrescriptionTemplate', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls updatePrescriptionTemplateUseCase with id and data on mutate', async () => {
    const model = { id: 'tpl-uuid' }
    ;(updatePrescriptionTemplateUseCase as jest.Mock).mockResolvedValue(model)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useUpdatePrescriptionTemplate(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ id: 'tpl-uuid', data: { name: 'Novo nome' } })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(updatePrescriptionTemplateUseCase).toHaveBeenCalledWith('tpl-uuid', { name: 'Novo nome' })
  })

  it('invalidates prescription-templates query on success', async () => {
    ;(updatePrescriptionTemplateUseCase as jest.Mock).mockResolvedValue({ id: 'tpl-uuid' })

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useUpdatePrescriptionTemplate(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ id: 'tpl-uuid', data: { name: 'Novo nome' } })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['prescription-templates'] })
  })
})
