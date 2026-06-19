jest.mock('../use-cases/get-theme-by-id.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { getThemeByIdUseCase } from '../use-cases/get-theme-by-id.use-case'
import { useTheme } from './use-theme.hook'

const mockGetThemeById = getThemeByIdUseCase as jest.Mock

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const model = { id: 'uuid-1', name: 'Salvia' }

describe('useTheme', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches theme by id when id is provided', async () => {
    mockGetThemeById.mockResolvedValue(model)

    const { result } = renderHook(() => useTheme('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(model)
    expect(mockGetThemeById).toHaveBeenCalledWith('uuid-1')
  })

  it('does not fetch when id is empty string', () => {
    const { result } = renderHook(() => useTheme(''), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockGetThemeById).not.toHaveBeenCalled()
  })
})
