jest.mock('../use-cases/delete-user.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { deleteUserUseCase } from '../use-cases/delete-user.use-case'
import { useDeleteUser } from './use-delete-user.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useDeleteUser', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls deleteUserUseCase with id', async () => {
    ;(deleteUserUseCase as jest.Mock).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteUser(), { wrapper })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => {
      expect(deleteUserUseCase).toHaveBeenCalled()
      const [firstArg] = (deleteUserUseCase as jest.Mock).mock.calls[0]
      expect(firstArg).toBe('uuid-1')
    })
  })

  it('reports success state after deletion', async () => {
    ;(deleteUserUseCase as jest.Mock).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteUser(), { wrapper })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('reports error state when deleteUserUseCase rejects', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'User not found' }
    ;(deleteUserUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useDeleteUser(), { wrapper })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
