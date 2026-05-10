jest.mock('../use-cases/delete-patient.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { deletePatientUseCase } from '../use-cases/delete-patient.use-case'
import { useDeletePatient } from './use-delete-patient.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useDeletePatient', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls deletePatientUseCase with id', async () => {
    ;(deletePatientUseCase as jest.Mock).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeletePatient(), { wrapper })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => {
      expect(deletePatientUseCase).toHaveBeenCalled()
      const [firstArg] = (deletePatientUseCase as jest.Mock).mock.calls[0]
      expect(firstArg).toBe('uuid-1')
    })
  })

  it('reports success state after deletion', async () => {
    ;(deletePatientUseCase as jest.Mock).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeletePatient(), { wrapper })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('reports error state when deletePatientUseCase rejects', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Patient not found' }
    ;(deletePatientUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useDeletePatient(), { wrapper })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
