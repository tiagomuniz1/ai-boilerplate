jest.mock('../use-cases/fetch-consultation-photo-blob.use-case')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fetchConsultationPhotoBlobUseCase } from '../use-cases/fetch-consultation-photo-blob.use-case'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PhotoPreviewModal } from './photo-preview-modal'
import type { IConsultationPhotoGalleryItemModel, IConsultationPhotoModel } from '../types/consultation-photo-model.types'

const mockFetchBlob = fetchConsultationPhotoBlobUseCase as jest.Mock

function makePhoto(overrides: Partial<IConsultationPhotoModel> = {}): IConsultationPhotoModel {
  return {
    id: 'photo-uuid',
    appointmentId: 'appointment-uuid',
    fileName: 'evolucao.jpg',
    mimeType: 'image/jpeg',
    fileSizeBytes: 1000,
    createdAt: new Date('2026-01-05T10:00:00.000Z'),
    ...overrides,
  }
}

function makeGalleryPhoto(overrides: Partial<IConsultationPhotoGalleryItemModel> = {}): IConsultationPhotoGalleryItemModel {
  return {
    ...makePhoto(),
    professionalName: 'Ana Nutri',
    appointmentDate: new Date('2026-01-04'),
    ...overrides,
  }
}

const defaultProps = {
  photo: makePhoto(),
  onClose: jest.fn(),
  canDelete: true,
  isDeleting: false,
  onDelete: jest.fn(),
}

describe('PhotoPreviewModal (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url')
    global.URL.revokeObjectURL = jest.fn()
  })

  it('renders nothing when photo is null', () => {
    mockFetchBlob.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<PhotoPreviewModal {...defaultProps} photo={null} />)
    expect(screen.queryByTestId('photo-preview-modal')).not.toBeInTheDocument()
  })

  it('shows the enlarged image once the blob resolves', async () => {
    mockFetchBlob.mockResolvedValue(new Blob(['image-bytes'], { type: 'image/jpeg' }))

    renderWithProviders(<PhotoPreviewModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('photo-preview-image')).toBeInTheDocument()
    })
    expect(screen.getByTestId('photo-preview-date')).toBeInTheDocument()
  })

  it('does not show professional info for a plain (non-gallery) photo', async () => {
    mockFetchBlob.mockResolvedValue(new Blob(['image-bytes'], { type: 'image/jpeg' }))
    renderWithProviders(<PhotoPreviewModal {...defaultProps} />)

    await waitFor(() => expect(screen.getByTestId('photo-preview-image')).toBeInTheDocument())
    expect(screen.queryByTestId('photo-preview-professional')).not.toBeInTheDocument()
  })

  it('shows professional name for a gallery item photo', async () => {
    mockFetchBlob.mockResolvedValue(new Blob(['image-bytes'], { type: 'image/jpeg' }))
    renderWithProviders(<PhotoPreviewModal {...defaultProps} photo={makeGalleryPhoto()} />)

    await waitFor(() => expect(screen.getByTestId('photo-preview-professional')).toHaveTextContent('Ana Nutri'))
  })

  it('shows the delete button when canDelete is true', async () => {
    mockFetchBlob.mockResolvedValue(new Blob(['image-bytes'], { type: 'image/jpeg' }))
    renderWithProviders(<PhotoPreviewModal {...defaultProps} />)

    await waitFor(() => expect(screen.getByTestId('photo-preview-delete-button')).toBeInTheDocument())
  })

  it('does not show the delete button when canDelete is false (read-only gallery view)', async () => {
    mockFetchBlob.mockResolvedValue(new Blob(['image-bytes'], { type: 'image/jpeg' }))
    renderWithProviders(<PhotoPreviewModal {...defaultProps} canDelete={false} onDelete={undefined} />)

    await waitFor(() => expect(screen.getByTestId('photo-preview-image')).toBeInTheDocument())
    expect(screen.queryByTestId('photo-preview-delete-button')).not.toBeInTheDocument()
  })

  it('calls onDelete with the photo id when the delete button is clicked', async () => {
    mockFetchBlob.mockResolvedValue(new Blob(['image-bytes'], { type: 'image/jpeg' }))
    const onDelete = jest.fn()
    renderWithProviders(<PhotoPreviewModal {...defaultProps} onDelete={onDelete} />)

    await waitFor(() => expect(screen.getByTestId('photo-preview-delete-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('photo-preview-delete-button'))

    expect(onDelete).toHaveBeenCalledWith('photo-uuid')
  })

  it('shows an error message when the blob fails to load', async () => {
    mockFetchBlob.mockRejectedValue(new Error('network error'))
    renderWithProviders(<PhotoPreviewModal {...defaultProps} />)

    await waitFor(() => expect(screen.getByTestId('photo-preview-error')).toBeInTheDocument())
  })

  describe('gallery navigation', () => {
    it('does not show either arrow when hasPrevious/hasNext are not provided', async () => {
      mockFetchBlob.mockResolvedValue(new Blob(['image-bytes'], { type: 'image/jpeg' }))
      renderWithProviders(<PhotoPreviewModal {...defaultProps} />)

      await waitFor(() => expect(screen.getByTestId('photo-preview-image')).toBeInTheDocument())
      expect(screen.queryByTestId('photo-preview-previous-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('photo-preview-next-button')).not.toBeInTheDocument()
    })

    it('shows only the next arrow when there is no previous photo', async () => {
      mockFetchBlob.mockResolvedValue(new Blob(['image-bytes'], { type: 'image/jpeg' }))
      renderWithProviders(
        <PhotoPreviewModal {...defaultProps} hasPrevious={false} hasNext onNext={jest.fn()} onPrevious={jest.fn()} />,
      )

      await waitFor(() => expect(screen.getByTestId('photo-preview-image')).toBeInTheDocument())
      expect(screen.queryByTestId('photo-preview-previous-button')).not.toBeInTheDocument()
      expect(screen.getByTestId('photo-preview-next-button')).toBeInTheDocument()
    })

    it('shows only the previous arrow when there is no next photo', async () => {
      mockFetchBlob.mockResolvedValue(new Blob(['image-bytes'], { type: 'image/jpeg' }))
      renderWithProviders(
        <PhotoPreviewModal {...defaultProps} hasPrevious hasNext={false} onNext={jest.fn()} onPrevious={jest.fn()} />,
      )

      await waitFor(() => expect(screen.getByTestId('photo-preview-image')).toBeInTheDocument())
      expect(screen.getByTestId('photo-preview-previous-button')).toBeInTheDocument()
      expect(screen.queryByTestId('photo-preview-next-button')).not.toBeInTheDocument()
    })

    it('calls onNext when the next arrow is clicked', async () => {
      mockFetchBlob.mockResolvedValue(new Blob(['image-bytes'], { type: 'image/jpeg' }))
      const onNext = jest.fn()
      renderWithProviders(<PhotoPreviewModal {...defaultProps} hasPrevious hasNext onNext={onNext} onPrevious={jest.fn()} />)

      await waitFor(() => expect(screen.getByTestId('photo-preview-next-button')).toBeInTheDocument())
      await userEvent.click(screen.getByTestId('photo-preview-next-button'))

      expect(onNext).toHaveBeenCalledTimes(1)
    })

    it('calls onPrevious when the previous arrow is clicked', async () => {
      mockFetchBlob.mockResolvedValue(new Blob(['image-bytes'], { type: 'image/jpeg' }))
      const onPrevious = jest.fn()
      renderWithProviders(
        <PhotoPreviewModal {...defaultProps} hasPrevious hasNext onNext={jest.fn()} onPrevious={onPrevious} />,
      )

      await waitFor(() => expect(screen.getByTestId('photo-preview-previous-button')).toBeInTheDocument())
      await userEvent.click(screen.getByTestId('photo-preview-previous-button'))

      expect(onPrevious).toHaveBeenCalledTimes(1)
    })

    it('navigates with the ArrowRight/ArrowLeft keys', async () => {
      mockFetchBlob.mockResolvedValue(new Blob(['image-bytes'], { type: 'image/jpeg' }))
      const onNext = jest.fn()
      const onPrevious = jest.fn()
      renderWithProviders(
        <PhotoPreviewModal {...defaultProps} hasPrevious hasNext onNext={onNext} onPrevious={onPrevious} />,
      )

      await waitFor(() => expect(screen.getByTestId('photo-preview-image')).toBeInTheDocument())

      await userEvent.keyboard('{ArrowRight}')
      expect(onNext).toHaveBeenCalledTimes(1)

      await userEvent.keyboard('{ArrowLeft}')
      expect(onPrevious).toHaveBeenCalledTimes(1)
    })

    it('does not navigate on ArrowRight when hasNext is false', async () => {
      mockFetchBlob.mockResolvedValue(new Blob(['image-bytes'], { type: 'image/jpeg' }))
      const onNext = jest.fn()
      renderWithProviders(
        <PhotoPreviewModal {...defaultProps} hasPrevious={false} hasNext={false} onNext={onNext} onPrevious={jest.fn()} />,
      )

      await waitFor(() => expect(screen.getByTestId('photo-preview-image')).toBeInTheDocument())
      await userEvent.keyboard('{ArrowRight}')

      expect(onNext).not.toHaveBeenCalled()
    })
  })
})
