jest.mock('../use-cases/create-user.use-case')
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { UserRole } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { createUserUseCase } from '../use-cases/create-user.use-case'
import { useCreateUser } from './use-create-user.hook'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useCreateUser', () => {
  const input = { fullName: 'Alice', email: 'alice@example.com', password: 'password123', role: UserRole.USER }
  const model = { id: 'uuid-1', fullName: 'Alice', email: 'alice@example.com', role: UserRole.USER, createdAt: new Date(), updatedAt: new Date() }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls createUserUseCase with input', async () => {
    ;(createUserUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useCreateUser(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => {
      expect(createUserUseCase).toHaveBeenCalled()
      const [firstArg] = (createUserUseCase as jest.Mock).mock.calls[0]
      expect(firstArg).toEqual(input)
    })
  })

  it('invalidates users cache and navigates to /users on success', async () => {
    ;(createUserUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useCreateUser(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/users')
    })
  })

  it('does not navigate on error', async () => {
    const error = { status: 422, title: 'Unprocessable Entity', detail: 'Validation failed' }
    ;(createUserUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useCreateUser(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
