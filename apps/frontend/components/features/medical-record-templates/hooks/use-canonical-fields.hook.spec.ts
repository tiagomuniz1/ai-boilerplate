jest.mock('../use-cases/list-canonical-fields.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MedicalRecordFieldType } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { listCanonicalFieldsUseCase } from '../use-cases/list-canonical-fields.use-case'
import { useCanonicalFields } from './use-canonical-fields.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  canonicalKey: 'blood_pressure',
  label: 'Pressão arterial',
  type: MedicalRecordFieldType.NUMBER,
  options: null,
  unit: 'mmHg',
  specialtyId: null,
  description: null,
})

describe('useCanonicalFields', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns fields on success', async () => {
    const model = makeModel()
    ;(listCanonicalFieldsUseCase as jest.Mock).mockResolvedValue([model])

    const { result } = renderHook(() => useCanonicalFields(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([model])
  })

  it('passes specialtyId when provided', async () => {
    ;(listCanonicalFieldsUseCase as jest.Mock).mockResolvedValue([])

    const { result } = renderHook(() => useCanonicalFields('spec-uuid'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listCanonicalFieldsUseCase).toHaveBeenCalledWith('spec-uuid')
  })

  it('returns error state on failure', async () => {
    ;(listCanonicalFieldsUseCase as jest.Mock).mockRejectedValue(new Error('error'))

    const { result } = renderHook(() => useCanonicalFields(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
