jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'backoffice'), useBasePath: () => '/backoffice' }))
jest.mock('../use-cases/create-medication.use-case')

import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createQueryClient } from '@/lib/react-query.config'
import { createMedicationUseCase } from '../use-cases/create-medication.use-case'
import { useCreateMedication } from './use-create-medication.hook'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ mutations: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('useCreateMedication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('creates the medication and redirects to the list', async () => {
    ;(createMedicationUseCase as jest.Mock).mockResolvedValue({ id: 'm1' })
    const { result } = renderHook(() => useCreateMedication(), { wrapper })

    const input = { name: 'Dipirona' }
    await act(async () => {
      result.current.mutate(input)
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect((createMedicationUseCase as jest.Mock).mock.calls[0][0]).toEqual(input)
    expect(mockPush).toHaveBeenCalledWith('/backoffice/medications')
  })

  it('exposes the error state on failure', async () => {
    ;(createMedicationUseCase as jest.Mock).mockRejectedValue({ status: 400 })
    const { result } = renderHook(() => useCreateMedication(), { wrapper })

    await act(async () => {
      result.current.mutate({ name: 'X' })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockPush).not.toHaveBeenCalled()
  })
})
