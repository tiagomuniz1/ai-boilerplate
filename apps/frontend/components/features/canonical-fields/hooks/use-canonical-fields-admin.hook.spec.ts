jest.mock('../use-cases/list-canonical-fields-admin.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { MedicalRecordFieldType } from '@app/shared'
import { listCanonicalFieldsAdminUseCase } from '../use-cases/list-canonical-fields-admin.use-case'
import { useCanonicalFieldsAdmin } from './use-canonical-fields-admin.hook'

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
  unit: null,
  specialtyId: null,
  description: null,
  isActive: true,
})

describe('useCanonicalFieldsAdmin', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns list of canonical fields on success', async () => {
    const model = makeModel()
    ;(listCanonicalFieldsAdminUseCase as jest.Mock).mockResolvedValue([model])

    const { result } = renderHook(() => useCanonicalFieldsAdmin(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([model])
  })

  it('passes params to use-case', async () => {
    ;(listCanonicalFieldsAdminUseCase as jest.Mock).mockResolvedValue([])

    const params = { includeInactive: true, specialtyId: 'spec-uuid' }
    const { result } = renderHook(() => useCanonicalFieldsAdmin(params), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(listCanonicalFieldsAdminUseCase).toHaveBeenCalledWith(params)
  })

  it('returns error state on failure', async () => {
    ;(listCanonicalFieldsAdminUseCase as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useCanonicalFieldsAdmin(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
