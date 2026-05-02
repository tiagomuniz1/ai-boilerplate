jest.mock('../use-cases/list-users.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { UserRole } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { listUsersUseCase } from '../use-cases/list-users.use-case'
import { useUsers } from './use-users.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('useUsers', () => {
  const models = [{ id: 'uuid-1', fullName: 'Alice', email: 'alice@example.com', role: UserRole.USER, createdAt: new Date(), updatedAt: new Date() }]

  beforeEach(() => jest.clearAllMocks())

  it('returns data from listUsersUseCase on success', async () => {
    ;(listUsersUseCase as jest.Mock).mockResolvedValue(models)

    const { result } = renderHook(() => useUsers(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(models)
  })

  it('returns error when listUsersUseCase rejects', async () => {
    const error = { status: 500, title: 'Internal Error', detail: 'Server error' }
    ;(listUsersUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useUsers(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('uses ["users"] as queryKey', async () => {
    ;(listUsersUseCase as jest.Mock).mockResolvedValue(models)

    const { result } = renderHook(() => useUsers(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(listUsersUseCase).toHaveBeenCalled()
  })
})
