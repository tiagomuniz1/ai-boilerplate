jest.mock('@/components/features/auth/services/auth.service')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/components/features/auth/services/auth.service'
import { useLogout } from './use-logout.hook'
import { createQueryClient } from '@/lib/react-query.config'

const mockAuthService = authService as jest.Mocked<typeof authService>
const mockUseRouter = useRouter as jest.Mock

function renderLogoutHook() {
  const push = jest.fn()
  mockUseRouter.mockReturnValue({ push })

  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { retry: 0 } })

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)

  const rendered = renderHook(() => useLogout(), { wrapper })

  return { ...rendered, push }
}

describe('useLogout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({ user: { id: 'u1', fullName: 'Test User', email: 'test@example.com' } })
  })

  it('returns error as null initially', () => {
    mockUseRouter.mockReturnValue({ push: jest.fn() })
    const { result } = renderLogoutHook()

    expect(result.current.error).toBeNull()
  })

  it('returns isPending as false initially', () => {
    mockUseRouter.mockReturnValue({ push: jest.fn() })
    const { result } = renderLogoutHook()

    expect(result.current.isPending).toBe(false)
  })

  it('calls authService.logout when logout is invoked', async () => {
    mockAuthService.logout.mockResolvedValue(undefined)
    const { result } = renderLogoutHook()

    await act(async () => {
      await result.current.logout()
    })

    expect(mockAuthService.logout).toHaveBeenCalledTimes(1)
  })

  it('calls setUser(null) on success', async () => {
    mockAuthService.logout.mockResolvedValue(undefined)
    const { result } = renderLogoutHook()

    await act(async () => {
      await result.current.logout()
    })

    expect(useAuthStore.getState().user).toBeNull()
  })

  it('calls router.push("/login") on success', async () => {
    mockAuthService.logout.mockResolvedValue(undefined)
    const { result, push } = renderLogoutHook()

    await act(async () => {
      await result.current.logout()
    })

    expect(push).toHaveBeenCalledWith('/login')
  })

  it('sets friendly error message on failure', async () => {
    mockAuthService.logout.mockRejectedValue(new Error('Network error'))
    const { result } = renderLogoutHook()

    await act(async () => {
      try {
        await result.current.logout()
      } catch {
        // swallow — mutateAsync re-throws, onError already set state
      }
    })

    expect(result.current.error).toBe('Ocorreu um erro ao sair. Tente novamente.')
  })

  it('clears error before each new logout attempt', async () => {
    mockAuthService.logout.mockRejectedValueOnce(new Error('First error'))
    mockAuthService.logout.mockResolvedValue(undefined)

    const { result } = renderLogoutHook()

    await act(async () => {
      try {
        await result.current.logout()
      } catch {
        // swallow
      }
    })

    expect(result.current.error).toBe('Ocorreu um erro ao sair. Tente novamente.')

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.error).toBeNull()
  })
})
