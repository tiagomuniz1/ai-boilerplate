jest.mock('../use-cases/set-password.use-case')
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: () => 'test-clinic' }))

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { setPasswordUseCase } from '../use-cases/set-password.use-case'
import { useSetPassword } from './use-set-password.hook'
import { createQueryClient } from '@/lib/react-query.config'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useSetPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls setPasswordUseCase and redirects to login with passwordSet=true on success', async () => {
    ;(setPasswordUseCase as jest.Mock).mockResolvedValue(undefined)

    const { result } = renderHook(() => useSetPassword(), { wrapper })

    act(() => {
      result.current.mutate({ token: 'tok', password: 'newpass1' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [firstArg] = (setPasswordUseCase as jest.Mock).mock.calls[0]
    expect(firstArg).toEqual({ token: 'tok', password: 'newpass1' })
    expect(mockPush).toHaveBeenCalledWith('/test-clinic/login?passwordSet=true')
  })

  it('does not redirect on error', async () => {
    ;(setPasswordUseCase as jest.Mock).mockRejectedValue({ status: 422 })

    const { result } = renderHook(() => useSetPassword(), { wrapper })

    act(() => {
      result.current.mutate({ token: 'used', password: 'password1' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
