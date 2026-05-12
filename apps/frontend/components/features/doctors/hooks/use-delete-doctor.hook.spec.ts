jest.mock('../use-cases/delete-doctor.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { deleteDoctorUseCase } from '../use-cases/delete-doctor.use-case'
import { useDeleteDoctor } from './use-delete-doctor.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useDeleteDoctor', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls deleteDoctorUseCase with given id', async () => {
    ;(deleteDoctorUseCase as jest.Mock).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteDoctor(), { wrapper })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => {
      expect(deleteDoctorUseCase).toHaveBeenCalled()
      const [firstArg] = (deleteDoctorUseCase as jest.Mock).mock.calls[0]
      expect(firstArg).toBe('uuid-1')
    })
  })

  it('returns error state on failure', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Doctor not found' }
    ;(deleteDoctorUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useDeleteDoctor(), { wrapper })

    act(() => result.current.mutate('uuid-1'))

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
