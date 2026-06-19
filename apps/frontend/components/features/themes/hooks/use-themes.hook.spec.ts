jest.mock('../use-cases/get-themes.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { getThemesUseCase } from '../use-cases/get-themes.use-case'
import { useThemes } from './use-themes.hook'

const mockGetThemes = getThemesUseCase as jest.Mock

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const paginated = { data: [{ id: 'uuid-1', name: 'Salvia' }], total: 1, page: 1, limit: 20 }

describe('useThemes', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches themes with default page=1 and limit=20', async () => {
    mockGetThemes.mockResolvedValue(paginated)

    const { result } = renderHook(() => useThemes(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(paginated)
    expect(mockGetThemes).toHaveBeenCalledWith(1, 20)
  })

  it('fetches themes with custom page and limit', async () => {
    const page2 = { data: [], total: 0, page: 2, limit: 10 }
    mockGetThemes.mockResolvedValue(page2)

    const { result } = renderHook(() => useThemes(2, 10), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockGetThemes).toHaveBeenCalledWith(2, 10)
  })
})
