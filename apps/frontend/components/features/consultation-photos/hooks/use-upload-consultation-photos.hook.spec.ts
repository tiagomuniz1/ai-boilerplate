jest.mock('../use-cases/upload-consultation-photos.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { uploadConsultationPhotosUseCase } from '../use-cases/upload-consultation-photos.use-case'
import { useUploadConsultationPhotos } from './use-upload-consultation-photos.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useUploadConsultationPhotos', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls uploadConsultationPhotosUseCase with appointmentId and files', async () => {
    const uploaded = [{ id: 'photo-uuid' }]
    ;(uploadConsultationPhotosUseCase as jest.Mock).mockResolvedValue(uploaded)
    const files = [new File(['a'], 'evolucao.jpg', { type: 'image/jpeg' })]

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useUploadConsultationPhotos('appointment-uuid'), {
      wrapper: makeWrapper(client),
    })

    await act(async () => {
      result.current.mutate(files)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(uploadConsultationPhotosUseCase).toHaveBeenCalledWith('appointment-uuid', files)
  })

  it('invalidates appointment-photos query with appointmentId on success', async () => {
    ;(uploadConsultationPhotosUseCase as jest.Mock).mockResolvedValue([])

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useUploadConsultationPhotos('appointment-uuid'), {
      wrapper: makeWrapper(client),
    })

    await act(async () => {
      result.current.mutate([])
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['appointment-photos', 'appointment-uuid'] })
  })

  it('exposes error state when use-case throws', async () => {
    ;(uploadConsultationPhotosUseCase as jest.Mock).mockRejectedValue({ status: 422 })

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useUploadConsultationPhotos('appointment-uuid'), {
      wrapper: makeWrapper(client),
    })

    await act(async () => {
      result.current.mutate([])
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
