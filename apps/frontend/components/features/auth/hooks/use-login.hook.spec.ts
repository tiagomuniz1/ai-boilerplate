jest.mock('../use-cases/login.use-case')
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/stores/auth.store')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { loginUseCase } from '../use-cases/login.use-case'
import { useLogin } from './use-login.hook'
import { createQueryClient } from '@/lib/react-query.config'

const mockPush = jest.fn()
const mockSetUser = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useAuthStore as unknown as jest.Mock).mockImplementation((selector: (s: object) => unknown) =>
      selector({ user: null, setUser: mockSetUser }),
    )
  })

  it('calls loginUseCase with provided input', async () => {
    const user = { id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com' }
    ;(loginUseCase as jest.Mock).mockResolvedValue(user)

    const { result } = renderHook(() => useLogin(), { wrapper })

    act(() => {
      result.current.mutate({ email: 'alice@example.com', password: 'password123' })
    })

    await waitFor(() => expect(loginUseCase).toHaveBeenCalled())

    const [firstArg] = (loginUseCase as jest.Mock).mock.calls[0]
    expect(firstArg).toEqual({ email: 'alice@example.com', password: 'password123' })
  })

  it('calls setUser and router.push on success', async () => {
    const user = { id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com' }
    ;(loginUseCase as jest.Mock).mockResolvedValue(user)

    const { result } = renderHook(() => useLogin(), { wrapper })

    act(() => {
      result.current.mutate({ email: 'alice@example.com', password: 'password123' })
    })

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(user)
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('does not call setUser or router.push on error', async () => {
    ;(loginUseCase as jest.Mock).mockRejectedValue({
      status: 401,
      title: 'Unauthorized',
      detail: 'Invalid',
    })

    const { result } = renderHook(() => useLogin(), { wrapper })

    act(() => {
      result.current.mutate({ email: 'wrong@example.com', password: 'password123' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockSetUser).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })
})
