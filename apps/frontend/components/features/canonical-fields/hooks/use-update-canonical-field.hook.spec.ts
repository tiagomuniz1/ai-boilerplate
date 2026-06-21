jest.mock('../use-cases/update-canonical-field.use-case')

import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { MedicalRecordFieldType } from '@app/shared'
import { updateCanonicalFieldUseCase } from '../use-cases/update-canonical-field.use-case'
import { useUpdateCanonicalField } from './use-update-canonical-field.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ mutations: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  canonicalKey: 'weight',
  label: 'Peso atualizado',
  type: MedicalRecordFieldType.NUMBER,
  options: null,
  unit: null,
  specialtyId: null,
  description: null,
  isActive: false,
})

describe('useUpdateCanonicalField', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls updateCanonicalFieldUseCase with id and data', async () => {
    ;(updateCanonicalFieldUseCase as jest.Mock).mockResolvedValue(makeModel())
    const { result } = renderHook(() => useUpdateCanonicalField(), { wrapper })

    await act(async () => {
      result.current.mutate({ id: 'uuid-1', data: { isActive: false } })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(updateCanonicalFieldUseCase).toHaveBeenCalledWith('uuid-1', { isActive: false })
  })

  it('invalidates canonical-fields query on success', async () => {
    ;(updateCanonicalFieldUseCase as jest.Mock).mockResolvedValue(makeModel())
    const client = createQueryClient()
    client.setDefaultOptions({ mutations: { retry: false } })
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children)

    const { result } = renderHook(() => useUpdateCanonicalField(), { wrapper: customWrapper })

    await act(async () => { result.current.mutate({ id: 'uuid-1', data: { label: 'Novo' } }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['canonical-fields'] })
  })

  it('returns error state on failure', async () => {
    ;(updateCanonicalFieldUseCase as jest.Mock).mockRejectedValue({ status: 404 })
    const { result } = renderHook(() => useUpdateCanonicalField(), { wrapper })

    await act(async () => { result.current.mutate({ id: 'bad-id', data: { isActive: true } }) })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
