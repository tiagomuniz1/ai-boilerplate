jest.mock('../use-cases/delete-consultation-photo.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { deleteConsultationPhotoUseCase } from '../use-cases/delete-consultation-photo.use-case'
import { useDeleteConsultationPhoto } from './use-delete-consultation-photo.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useDeleteConsultationPhoto', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls deleteConsultationPhotoUseCase on mutate', async () => {
    ;(deleteConsultationPhotoUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useDeleteConsultationPhoto('appointment-uuid'), {
      wrapper: makeWrapper(client),
    })

    await act(async () => {
      result.current.mutate('photo-uuid')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteConsultationPhotoUseCase).toHaveBeenCalledWith('photo-uuid')
  })

  it('invalidates appointment-photos query with appointmentId on success', async () => {
    ;(deleteConsultationPhotoUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteConsultationPhoto('appointment-uuid'), {
      wrapper: makeWrapper(client),
    })

    await act(async () => {
      result.current.mutate('photo-uuid')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['appointment-photos', 'appointment-uuid'] })
  })
})
