jest.mock('../use-cases/get-active-theme.use-case')
jest.mock('@/stores/auth.store')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { useAuthStore } from '@/stores/auth.store'
import { getActiveThemeUseCase } from '../use-cases/get-active-theme.use-case'
import { useActiveTheme } from './use-active-theme.hook'

const mockGetActiveTheme = getActiveThemeUseCase as jest.Mock
const mockUseAuthStore = useAuthStore as unknown as jest.Mock

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const model = { id: 'uuid-1', name: 'Salvia' }

describe('useActiveTheme', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches active theme when user has clinicId', async () => {
    mockUseAuthStore.mockReturnValue({ clinicId: 'clinic-uuid' })
    mockGetActiveTheme.mockResolvedValue(model)

    const { result } = renderHook(() => useActiveTheme(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(model)
    expect(mockGetActiveTheme).toHaveBeenCalled()
  })

  it('does not fetch when user has no clinicId', () => {
    mockUseAuthStore.mockReturnValue(null)

    const { result } = renderHook(() => useActiveTheme(), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockGetActiveTheme).not.toHaveBeenCalled()
  })
})
