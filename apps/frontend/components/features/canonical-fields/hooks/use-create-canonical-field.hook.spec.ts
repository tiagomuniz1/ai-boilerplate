jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'backoffice') }))
jest.mock('../use-cases/create-canonical-field.use-case')

import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createQueryClient } from '@/lib/react-query.config'
import { MedicalRecordFieldType } from '@app/shared'
import { createCanonicalFieldUseCase } from '../use-cases/create-canonical-field.use-case'
import { useCreateCanonicalField } from './use-create-canonical-field.hook'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ mutations: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  canonicalKey: 'weight',
  label: 'Peso',
  type: MedicalRecordFieldType.NUMBER,
  options: null,
  unit: null,
  specialtyId: null,
  description: null,
  isActive: true,
})

describe('useCreateCanonicalField', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls createCanonicalFieldUseCase with input', async () => {
    ;(createCanonicalFieldUseCase as jest.Mock).mockResolvedValue(makeModel())
    const { result } = renderHook(() => useCreateCanonicalField(), { wrapper })

    const input = { canonicalKey: 'weight', label: 'Peso', type: MedicalRecordFieldType.NUMBER }
    await act(async () => { result.current.mutate(input) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect((createCanonicalFieldUseCase as jest.Mock).mock.calls[0][0]).toEqual(input)
  })

  it('redirects to canonical-fields list on success', async () => {
    ;(createCanonicalFieldUseCase as jest.Mock).mockResolvedValue(makeModel())
    const { result } = renderHook(() => useCreateCanonicalField(), { wrapper })

    await act(async () => {
      result.current.mutate({ canonicalKey: 'weight', label: 'Peso', type: MedicalRecordFieldType.NUMBER })
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockPush).toHaveBeenCalledWith('/backoffice/canonical-fields')
  })

  it('returns error state on failure', async () => {
    ;(createCanonicalFieldUseCase as jest.Mock).mockRejectedValue({ status: 409 })
    const { result } = renderHook(() => useCreateCanonicalField(), { wrapper })

    await act(async () => {
      result.current.mutate({ canonicalKey: 'dup', label: 'Dup', type: MedicalRecordFieldType.TEXT })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
