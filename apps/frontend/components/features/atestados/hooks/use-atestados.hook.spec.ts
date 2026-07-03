jest.mock('../use-cases/list-atestados.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { listAtestadosUseCase } from '../use-cases/list-atestados.use-case'
import { useAtestados } from './use-atestados.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('useAtestados', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls listAtestadosUseCase with appointmentId and exposes data', async () => {
    const models = [{ id: 'cert-1' }]
    ;(listAtestadosUseCase as jest.Mock).mockResolvedValue(models)

    const { result } = renderHook(() => useAtestados('appt-uuid'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listAtestadosUseCase).toHaveBeenCalledWith('appt-uuid')
    expect(result.current.data).toBe(models)
  })

  it('exposes error state when use-case throws', async () => {
    ;(listAtestadosUseCase as jest.Mock).mockRejectedValue(new Error('fetch error'))

    const { result } = renderHook(() => useAtestados('appt-uuid'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
