jest.mock('../use-cases/get-canonical-field-admin.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { MedicalRecordFieldType } from '@app/shared'
import { getCanonicalFieldAdminUseCase } from '../use-cases/get-canonical-field-admin.use-case'
import { useCanonicalFieldAdmin } from './use-canonical-field-admin.hook'

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

describe('useCanonicalFieldAdmin', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns canonical field on success', async () => {
    const model = makeModel()
    ;(getCanonicalFieldAdminUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useCanonicalFieldAdmin('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBe(model)
    expect(getCanonicalFieldAdminUseCase).toHaveBeenCalledWith('uuid-1')
  })

  it('returns error state on failure', async () => {
    ;(getCanonicalFieldAdminUseCase as jest.Mock).mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useCanonicalFieldAdmin('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('does not fetch when id is empty', () => {
    ;(getCanonicalFieldAdminUseCase as jest.Mock).mockResolvedValue(makeModel())

    const { result } = renderHook(() => useCanonicalFieldAdmin(''), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getCanonicalFieldAdminUseCase).not.toHaveBeenCalled()
  })
})
