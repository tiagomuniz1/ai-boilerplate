jest.mock('../use-cases/fetch-consultation-photo-blob.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { fetchConsultationPhotoBlobUseCase } from '../use-cases/fetch-consultation-photo-blob.use-case'
import { usePhotoThumbnail } from './use-photo-thumbnail.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('usePhotoThumbnail', () => {
  let createObjectURLMock: jest.Mock
  let revokeObjectURLMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    createObjectURLMock = jest.fn().mockReturnValue('blob:mock-url')
    revokeObjectURLMock = jest.fn()
    global.URL.createObjectURL = createObjectURLMock
    global.URL.revokeObjectURL = revokeObjectURLMock
  })

  it('starts with url null and isLoading true', () => {
    ;(fetchConsultationPhotoBlobUseCase as jest.Mock).mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => usePhotoThumbnail('photo-uuid'), { wrapper })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.url).toBeNull()
  })

  it('creates an object URL once the blob resolves', async () => {
    const blob = new Blob(['image-bytes'], { type: 'image/jpeg' })
    ;(fetchConsultationPhotoBlobUseCase as jest.Mock).mockResolvedValue(blob)

    const { result } = renderHook(() => usePhotoThumbnail('photo-uuid'), { wrapper })

    await waitFor(() => expect(result.current.url).toBe('blob:mock-url'))
    expect(createObjectURLMock).toHaveBeenCalledWith(blob)
  })

  it('revokes the object URL on unmount', async () => {
    const blob = new Blob(['image-bytes'], { type: 'image/jpeg' })
    ;(fetchConsultationPhotoBlobUseCase as jest.Mock).mockResolvedValue(blob)

    const { result, unmount } = renderHook(() => usePhotoThumbnail('photo-uuid'), { wrapper })

    await waitFor(() => expect(result.current.url).toBe('blob:mock-url'))

    unmount()

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url')
  })

  it('revokes the previous object URL when photoId changes', async () => {
    const blobA = new Blob(['a'], { type: 'image/jpeg' })
    const blobB = new Blob(['b'], { type: 'image/jpeg' })
    ;(fetchConsultationPhotoBlobUseCase as jest.Mock).mockImplementation((id: string) =>
      Promise.resolve(id === 'photo-a' ? blobA : blobB),
    )
    createObjectURLMock.mockImplementation((blob: Blob) => (blob === blobA ? 'blob:a' : 'blob:b'))

    const { result, rerender } = renderHook(({ photoId }) => usePhotoThumbnail(photoId), {
      wrapper,
      initialProps: { photoId: 'photo-a' },
    })

    await waitFor(() => expect(result.current.url).toBe('blob:a'))

    rerender({ photoId: 'photo-b' })

    await waitFor(() => expect(result.current.url).toBe('blob:b'))
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:a')
  })

  it('exposes isError when the fetch fails', async () => {
    ;(fetchConsultationPhotoBlobUseCase as jest.Mock).mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => usePhotoThumbnail('photo-uuid'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.url).toBeNull()
    expect(createObjectURLMock).not.toHaveBeenCalled()
  })
})
