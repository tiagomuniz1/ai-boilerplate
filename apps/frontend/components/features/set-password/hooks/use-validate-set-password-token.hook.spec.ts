jest.mock('../use-cases/validate-set-password-token.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { validateSetPasswordTokenUseCase } from '../use-cases/validate-set-password-token.use-case'
import { useValidateSetPasswordToken } from './use-validate-set-password-token.hook'
import { createQueryClient } from '@/lib/react-query.config'

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useValidateSetPasswordToken', () => {
  beforeEach(() => jest.clearAllMocks())

  it('does not run the query when token is null', () => {
    const { result } = renderHook(() => useValidateSetPasswordToken(null), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(validateSetPasswordTokenUseCase).not.toHaveBeenCalled()
  })

  it('runs the query and returns data when token is a string', async () => {
    const response = { valid: true, email: 'doc@example.com' }
    ;(validateSetPasswordTokenUseCase as jest.Mock).mockResolvedValue(response)

    const { result } = renderHook(() => useValidateSetPasswordToken('mytoken'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(validateSetPasswordTokenUseCase).toHaveBeenCalledWith('mytoken')
    expect(result.current.data).toEqual(response)
  })

  it('returns error state when use-case throws', async () => {
    ;(validateSetPasswordTokenUseCase as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useValidateSetPasswordToken('badtoken'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
