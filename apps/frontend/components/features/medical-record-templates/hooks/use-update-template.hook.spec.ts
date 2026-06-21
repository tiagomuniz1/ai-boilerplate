jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'clinic-slug') }))
jest.mock('../use-cases/update-template.use-case')

import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createQueryClient } from '@/lib/react-query.config'
import { updateTemplateUseCase } from '../use-cases/update-template.use-case'
import { useUpdateTemplate } from './use-update-template.hook'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ mutations: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardio',
  name: 'Atualizado',
  fields: [],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useUpdateTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls updateTemplateUseCase with id and input', async () => {
    ;(updateTemplateUseCase as jest.Mock).mockResolvedValue(makeModel())
    const { result } = renderHook(() => useUpdateTemplate('uuid-1'), { wrapper })

    const input = { name: 'Atualizado' }
    await act(async () => { result.current.mutate(input) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(updateTemplateUseCase).toHaveBeenCalledWith('uuid-1', input)
  })

  it('redirects to template details on success', async () => {
    ;(updateTemplateUseCase as jest.Mock).mockResolvedValue(makeModel())
    const { result } = renderHook(() => useUpdateTemplate('uuid-1'), { wrapper })

    await act(async () => { result.current.mutate({ name: 'Novo' }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockPush).toHaveBeenCalledWith('/clinic-slug/medical-record-templates/uuid-1')
  })

  it('returns error state on failure', async () => {
    ;(updateTemplateUseCase as jest.Mock).mockRejectedValue({ status: 422 })
    const { result } = renderHook(() => useUpdateTemplate('uuid-1'), { wrapper })

    await act(async () => { result.current.mutate({ name: '' }) })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
