jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'clinic-slug'), useBasePath: () => '/clinic-slug' }))
jest.mock('../use-cases/delete-template.use-case')

import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createQueryClient } from '@/lib/react-query.config'
import { deleteTemplateUseCase } from '../use-cases/delete-template.use-case'
import { useDeleteTemplate } from './use-delete-template.hook'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ mutations: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('useDeleteTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls deleteTemplateUseCase with id', async () => {
    ;(deleteTemplateUseCase as jest.Mock).mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeleteTemplate(), { wrapper })

    await act(async () => { result.current.mutate('uuid-1') })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect((deleteTemplateUseCase as jest.Mock).mock.calls[0][0]).toBe('uuid-1')
  })

  it('redirects to templates list on success', async () => {
    ;(deleteTemplateUseCase as jest.Mock).mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeleteTemplate(), { wrapper })

    await act(async () => { result.current.mutate('uuid-1') })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockPush).toHaveBeenCalledWith('/clinic-slug/medical-record-templates')
  })

  it('returns error state on failure', async () => {
    ;(deleteTemplateUseCase as jest.Mock).mockRejectedValue(new Error('error'))
    const { result } = renderHook(() => useDeleteTemplate(), { wrapper })

    await act(async () => { result.current.mutate('uuid-1') })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
