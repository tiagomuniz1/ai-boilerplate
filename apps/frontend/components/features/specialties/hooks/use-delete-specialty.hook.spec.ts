jest.mock('../use-cases/delete-specialty.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { deleteSpecialtyUseCase } from '../use-cases/delete-specialty.use-case'
import { useDeleteSpecialty } from './use-delete-specialty.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useDeleteSpecialty', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls deleteSpecialtyUseCase with given id', async () => {
    ;(deleteSpecialtyUseCase as jest.Mock).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteSpecialty(), { wrapper })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => {
      expect(deleteSpecialtyUseCase).toHaveBeenCalled()
      const [firstArg] = (deleteSpecialtyUseCase as jest.Mock).mock.calls[0]
      expect(firstArg).toBe('uuid-1')
    })
  })

  it('returns error state on failure', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Specialty not found' }
    ;(deleteSpecialtyUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useDeleteSpecialty(), { wrapper })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
