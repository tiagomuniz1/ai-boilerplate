jest.mock('../use-cases/list-prescription-templates.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { listPrescriptionTemplatesUseCase } from '../use-cases/list-prescription-templates.use-case'
import { usePrescriptionTemplates } from './use-prescription-templates.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('usePrescriptionTemplates', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls listPrescriptionTemplatesUseCase and exposes data', async () => {
    const models = [{ id: 'tpl-1' }]
    ;(listPrescriptionTemplatesUseCase as jest.Mock).mockResolvedValue(models)

    const { result } = renderHook(() => usePrescriptionTemplates(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listPrescriptionTemplatesUseCase).toHaveBeenCalledWith(undefined)
    expect(result.current.data).toBe(models)
  })

  it('forwards params to the use-case', async () => {
    ;(listPrescriptionTemplatesUseCase as jest.Mock).mockResolvedValue([])

    const { result } = renderHook(() => usePrescriptionTemplates({ professionalId: 'doctor-uuid' }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listPrescriptionTemplatesUseCase).toHaveBeenCalledWith({ professionalId: 'doctor-uuid' })
  })

  it('exposes error state when use-case throws', async () => {
    ;(listPrescriptionTemplatesUseCase as jest.Mock).mockRejectedValue(new Error('fetch error'))

    const { result } = renderHook(() => usePrescriptionTemplates(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
