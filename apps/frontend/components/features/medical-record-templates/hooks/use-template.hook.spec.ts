jest.mock('../use-cases/get-template.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { getTemplateUseCase } from '../use-cases/get-template.use-case'
import { useTemplate } from './use-template.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  name: 'Anamnese',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  fields: [],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useTemplate', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches template by id on success', async () => {
    const model = makeModel()
    ;(getTemplateUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useTemplate('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(model)
    expect(getTemplateUseCase).toHaveBeenCalledWith('uuid-1')
  })

  it('does not fetch when id is empty', async () => {
    const { result } = renderHook(() => useTemplate(''), { wrapper })

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(getTemplateUseCase).not.toHaveBeenCalled()
  })

  it('returns error state on failure', async () => {
    ;(getTemplateUseCase as jest.Mock).mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useTemplate('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
