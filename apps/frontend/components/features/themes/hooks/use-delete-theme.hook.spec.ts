jest.mock('../services/themes.service')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { themesService } from '../services/themes.service'
import { useDeleteTheme } from './use-delete-theme.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useDeleteTheme', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls themesService.remove with id', async () => {
    ;(themesService.remove as jest.Mock).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteTheme(), { wrapper: makeWrapper(createQueryClient()) })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => {
      expect(themesService.remove).toHaveBeenCalled()
      const [firstArg] = (themesService.remove as jest.Mock).mock.calls[0]
      expect(firstArg).toBe('uuid-1')
    })
  })

  it('invalidates themes query on success', async () => {
    ;(themesService.remove as jest.Mock).mockResolvedValue(undefined)

    const client = createQueryClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteTheme(), { wrapper: makeWrapper(client) })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['themes'] })
  })

  it('reports success state after deletion', async () => {
    ;(themesService.remove as jest.Mock).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteTheme(), { wrapper: makeWrapper(createQueryClient()) })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('reports error state when themesService.remove rejects', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Theme not found' }
    ;(themesService.remove as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useDeleteTheme(), { wrapper: makeWrapper(createQueryClient()) })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
