jest.mock('../use-cases/get-user.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { UserRole } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { getUserUseCase } from '../use-cases/get-user.use-case'
import { useUser } from './use-user.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('useUser', () => {
  const model = { id: 'uuid-1', fullName: 'Alice', email: 'alice@example.com', role: UserRole.USER, createdAt: new Date(), updatedAt: new Date() }

  beforeEach(() => jest.clearAllMocks())

  it('calls getUserUseCase with id and returns data on success', async () => {
    ;(getUserUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useUser('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getUserUseCase).toHaveBeenCalledWith('uuid-1')
    expect(result.current.data).toEqual(model)
  })

  it('returns error when getUserUseCase rejects', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'User not found' }
    ;(getUserUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useUser('uuid-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
