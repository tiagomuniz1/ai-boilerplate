jest.mock('../use-cases/update-user.use-case')
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { UserRole } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { updateUserUseCase } from '../use-cases/update-user.use-case'
import { useUpdateUser } from './use-update-user.hook'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useUpdateUser', () => {
  const payload = { id: 'uuid-1', input: { fullName: 'Alice Updated', role: UserRole.ADMIN } }
  const model = { id: 'uuid-1', fullName: 'Alice Updated', email: 'alice@example.com', role: UserRole.ADMIN, createdAt: new Date(), updatedAt: new Date() }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls updateUserUseCase with id and input', async () => {
    ;(updateUserUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useUpdateUser(), { wrapper })

    act(() => result.current.mutate(payload))

    await waitFor(() => expect(updateUserUseCase).toHaveBeenCalledWith('uuid-1', payload.input))
  })

  it('navigates to /users on success', async () => {
    ;(updateUserUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useUpdateUser(), { wrapper })

    act(() => result.current.mutate(payload))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/users')
    })
  })

  it('does not navigate on error', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'User not found' }
    ;(updateUserUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useUpdateUser(), { wrapper })

    act(() => result.current.mutate(payload))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
