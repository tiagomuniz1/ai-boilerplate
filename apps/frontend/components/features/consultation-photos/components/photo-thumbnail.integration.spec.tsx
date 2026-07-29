jest.mock('../use-cases/fetch-consultation-photo-blob.use-case')

import { screen, waitFor } from '@testing-library/react'
import { fetchConsultationPhotoBlobUseCase } from '../use-cases/fetch-consultation-photo-blob.use-case'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PhotoThumbnail } from './photo-thumbnail'

const mockFetchBlob = fetchConsultationPhotoBlobUseCase as jest.Mock

describe('PhotoThumbnail (integration)', () => {
  let createObjectURLMock: jest.Mock
  let revokeObjectURLMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    createObjectURLMock = jest.fn().mockReturnValue('blob:mock-url')
    revokeObjectURLMock = jest.fn()
    global.URL.createObjectURL = createObjectURLMock
    global.URL.revokeObjectURL = revokeObjectURLMock
  })

  it('shows a skeleton while the blob is loading', () => {
    mockFetchBlob.mockReturnValue(new Promise(() => {}))

    renderWithProviders(
      <PhotoThumbnail photoId="photo-uuid" fileName="evolucao.jpg" createdAt={new Date('2026-01-05')} />,
    )

    expect(screen.getByTestId('photo-thumbnail-loading-photo-uuid')).toBeInTheDocument()
  })

  it('shows the image once the blob resolves', async () => {
    mockFetchBlob.mockResolvedValue(new Blob(['image-bytes'], { type: 'image/jpeg' }))

    renderWithProviders(
      <PhotoThumbnail photoId="photo-uuid" fileName="evolucao.jpg" createdAt={new Date('2026-01-05')} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('photo-thumbnail-image-photo-uuid')).toBeInTheDocument()
    })
    expect(screen.getByTestId('photo-thumbnail-image-photo-uuid')).toHaveAttribute('src', 'blob:mock-url')
  })

  it('shows a broken-image placeholder without crashing when the fetch fails', async () => {
    mockFetchBlob.mockRejectedValue(new Error('network error'))

    renderWithProviders(
      <PhotoThumbnail photoId="photo-uuid" fileName="evolucao.jpg" createdAt={new Date('2026-01-05')} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('photo-thumbnail-error-photo-uuid')).toBeInTheDocument()
    })
  })

  it('revokes the object URL when the thumbnail unmounts', async () => {
    mockFetchBlob.mockResolvedValue(new Blob(['image-bytes'], { type: 'image/jpeg' }))

    const { unmount } = renderWithProviders(
      <PhotoThumbnail photoId="photo-uuid" fileName="evolucao.jpg" createdAt={new Date('2026-01-05')} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('photo-thumbnail-image-photo-uuid')).toBeInTheDocument()
    })

    unmount()

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url')
  })

  it('displays the formatted upload date', () => {
    mockFetchBlob.mockReturnValue(new Promise(() => {}))

    renderWithProviders(
      <PhotoThumbnail photoId="photo-uuid" fileName="evolucao.jpg" createdAt={new Date('2026-01-05')} />,
    )

    expect(screen.getByTestId('photo-thumbnail-date-photo-uuid')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    mockFetchBlob.mockReturnValue(new Promise(() => {}))
    const onClick = jest.fn()

    renderWithProviders(
      <PhotoThumbnail
        photoId="photo-uuid"
        fileName="evolucao.jpg"
        createdAt={new Date('2026-01-05')}
        onClick={onClick}
      />,
    )

    screen.getByTestId('photo-thumbnail-photo-uuid').click()
    expect(onClick).toHaveBeenCalled()
  })
})
