jest.mock('../use-cases/delete-professional.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { deleteProfessionalUseCase } from '../use-cases/delete-professional.use-case'
import { useDeleteProfessional } from './use-delete-professional.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useDeleteProfessional', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls deleteProfessionalUseCase with given id', async () => {
    ;(deleteProfessionalUseCase as jest.Mock).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteProfessional(), { wrapper: makeWrapper(createQueryClient()) })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => {
      expect(deleteProfessionalUseCase).toHaveBeenCalled()
      const [firstArg] = (deleteProfessionalUseCase as jest.Mock).mock.calls[0]
      expect(firstArg).toBe('uuid-1')
    })
  })

  it('invalidates professionals and users queries on success', async () => {
    ;(deleteProfessionalUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = createQueryClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteProfessional(), { wrapper: makeWrapper(client) })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['professionals'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['users'] })
  })

  it('returns error state on failure', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Professional not found' }
    ;(deleteProfessionalUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useDeleteProfessional(), { wrapper: makeWrapper(createQueryClient()) })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
