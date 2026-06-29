jest.mock('../use-cases/list-prescriptions.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { listPrescriptionsUseCase } from '../use-cases/list-prescriptions.use-case'
import { usePrescriptions } from './use-prescriptions.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('usePrescriptions', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls listPrescriptionsUseCase with appointmentId and exposes data', async () => {
    const models = [{ id: 'rx-1' }]
    ;(listPrescriptionsUseCase as jest.Mock).mockResolvedValue(models)

    const { result } = renderHook(() => usePrescriptions('appt-uuid'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listPrescriptionsUseCase).toHaveBeenCalledWith('appt-uuid')
    expect(result.current.data).toBe(models)
  })

  it('exposes error state when use-case throws', async () => {
    ;(listPrescriptionsUseCase as jest.Mock).mockRejectedValue(new Error('fetch error'))

    const { result } = renderHook(() => usePrescriptions('appt-uuid'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
