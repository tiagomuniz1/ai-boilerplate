jest.mock('../services/consultation-photos.service')
jest.mock('../use-cases/fetch-consultation-photo-blob.use-case')

import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserRole } from '@app/shared'
import { consultationPhotosService } from '../services/consultation-photos.service'
import { fetchConsultationPhotoBlobUseCase } from '../use-cases/fetch-consultation-photo-blob.use-case'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PhotoSection } from './photo-section'

const mockService = consultationPhotosService as jest.Mocked<typeof consultationPhotosService>
const mockFetchBlob = fetchConsultationPhotoBlobUseCase as jest.Mock

const makePhotoDto = (overrides: object = {}) => ({
  id: 'photo-uuid',
  appointmentId: 'appointment-uuid',
  fileName: 'evolucao.jpg',
  mimeType: 'image/jpeg',
  fileSizeBytes: 1000,
  createdAt: '2026-01-05T10:00:00.000Z',
  ...overrides,
})

const professionalProps = { appointmentId: 'appointment-uuid', canManage: true, userRole: UserRole.PROFESSIONAL }
const adminProps = { appointmentId: 'appointment-uuid', canManage: true, userRole: UserRole.ADMIN }

describe('PhotoSection (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url')
    global.URL.revokeObjectURL = jest.fn()
    mockFetchBlob.mockReturnValue(new Promise(() => {}))
  })

  it('shows skeleton while loading', () => {
    mockService.getByAppointment.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<PhotoSection {...professionalProps} />)
    expect(screen.getByTestId('photo-grid-skeleton')).toBeInTheDocument()
  })

  it('shows error state when fetch fails', async () => {
    mockService.getByAppointment.mockRejectedValue(new Error('Network error'))
    renderWithProviders(<PhotoSection {...professionalProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('photo-section-error')).toBeInTheDocument()
    })
  })

  it('shows empty message when there are no photos', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<PhotoSection {...professionalProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('photo-section-empty')).toHaveTextContent('Nenhuma foto enviada.')
    })
  })

  it('renders a thumbnail grid when photos exist', async () => {
    mockService.getByAppointment.mockResolvedValue([makePhotoDto()] as any)
    renderWithProviders(<PhotoSection {...professionalProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('photo-thumbnail-photo-uuid')).toBeInTheDocument()
    })
  })

  it('shows the upload button for PROFESSIONAL with canManage', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<PhotoSection {...professionalProps} />)
    await waitFor(() => expect(screen.getByTestId('photo-section-empty')).toBeInTheDocument())
    expect(screen.getByTestId('photo-upload')).toBeInTheDocument()
  })

  it('does not show the upload button for ADMIN', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<PhotoSection {...adminProps} />)
    await waitFor(() => expect(screen.getByTestId('photo-section-empty')).toBeInTheDocument())
    expect(screen.queryByTestId('photo-upload')).not.toBeInTheDocument()
  })

  it('uploads files and refreshes the grid', async () => {
    mockService.getByAppointment.mockResolvedValueOnce([]).mockResolvedValueOnce([makePhotoDto()] as any)
    mockService.upload.mockResolvedValue([makePhotoDto()] as any)
    renderWithProviders(<PhotoSection {...professionalProps} />)

    await waitFor(() => expect(screen.getByTestId('photo-upload-button')).toBeInTheDocument())

    const file = new File(['a'], 'evolucao.jpg', { type: 'image/jpeg' })
    const input = screen.getByTestId('photo-upload-input')
    await userEvent.upload(input, file)

    await waitFor(() => expect(mockService.upload).toHaveBeenCalledWith('appointment-uuid', [file]))
    await waitFor(() => expect(screen.getByTestId('photo-thumbnail-photo-uuid')).toBeInTheDocument())
  })

  it('rejects an invalid file type on upload (client-side validation)', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<PhotoSection {...professionalProps} />)

    await waitFor(() => expect(screen.getByTestId('photo-upload-button')).toBeInTheDocument())

    // fireEvent bypasses the input's `accept` filter that userEvent.upload respects,
    // exercising the component's own mimetype validation instead of the browser's.
    const file = new File(['a'], 'doc.pdf', { type: 'application/pdf' })
    const input = screen.getByTestId('photo-upload-input') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)

    expect(screen.getByTestId('photo-upload-error')).toBeInTheDocument()
    expect(mockService.upload).not.toHaveBeenCalled()
  })

  it('opens the preview modal when a thumbnail is clicked', async () => {
    mockService.getByAppointment.mockResolvedValue([makePhotoDto()] as any)
    renderWithProviders(<PhotoSection {...professionalProps} />)

    await waitFor(() => expect(screen.getByTestId('photo-thumbnail-photo-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('photo-thumbnail-photo-uuid'))

    expect(screen.getByTestId('photo-preview-modal')).toBeInTheDocument()
  })

  it('navigates between photos in the preview using the next/previous arrows', async () => {
    mockService.getByAppointment.mockResolvedValue([
      makePhotoDto({ id: 'photo-1', fileName: 'a.jpg' }),
      makePhotoDto({ id: 'photo-2', fileName: 'b.jpg' }),
      makePhotoDto({ id: 'photo-3', fileName: 'c.jpg' }),
    ] as any)
    renderWithProviders(<PhotoSection {...professionalProps} />)

    await waitFor(() => expect(screen.getByTestId('photo-thumbnail-photo-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('photo-thumbnail-photo-1'))

    expect(screen.queryByTestId('photo-preview-previous-button')).not.toBeInTheDocument()
    expect(screen.getByTestId('photo-preview-next-button')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('photo-preview-next-button'))
    expect(screen.getByTestId('photo-preview-previous-button')).toBeInTheDocument()
    expect(screen.getByTestId('photo-preview-next-button')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('photo-preview-next-button'))
    expect(screen.getByTestId('photo-preview-previous-button')).toBeInTheDocument()
    expect(screen.queryByTestId('photo-preview-next-button')).not.toBeInTheDocument()

    await userEvent.click(screen.getByTestId('photo-preview-previous-button'))
    expect(screen.getByTestId('photo-preview-previous-button')).toBeInTheDocument()
    expect(screen.getByTestId('photo-preview-next-button')).toBeInTheDocument()
  })

  it('shows no navigation arrows when there is only one photo', async () => {
    mockService.getByAppointment.mockResolvedValue([makePhotoDto({ id: 'photo-1' })] as any)
    renderWithProviders(<PhotoSection {...professionalProps} />)

    await waitFor(() => expect(screen.getByTestId('photo-thumbnail-photo-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('photo-thumbnail-photo-1'))

    expect(screen.queryByTestId('photo-preview-previous-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('photo-preview-next-button')).not.toBeInTheDocument()
  })

  it('ADMIN can open the preview but sees no delete button in it', async () => {
    mockService.getByAppointment.mockResolvedValue([makePhotoDto()] as any)
    renderWithProviders(<PhotoSection {...adminProps} />)

    await waitFor(() => expect(screen.getByTestId('photo-thumbnail-photo-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('photo-thumbnail-photo-uuid'))

    expect(screen.getByTestId('photo-preview-modal')).toBeInTheDocument()
    expect(screen.queryByTestId('photo-preview-delete-button')).not.toBeInTheDocument()
  })

  it('deletes a photo after confirming in the dialog and closes the preview', async () => {
    mockService.getByAppointment.mockResolvedValueOnce([makePhotoDto()] as any).mockResolvedValueOnce([])
    mockService.remove.mockResolvedValue(undefined)
    renderWithProviders(<PhotoSection {...professionalProps} />)

    await waitFor(() => expect(screen.getByTestId('photo-thumbnail-photo-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('photo-thumbnail-photo-uuid'))
    await userEvent.click(screen.getByTestId('photo-preview-delete-button'))

    expect(screen.getByTestId('photo-delete-dialog')).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('photo-delete-dialog-confirm'))

    await waitFor(() => expect(mockService.remove).toHaveBeenCalledWith('photo-uuid'))
    await waitFor(() => expect(screen.queryByTestId('photo-preview-modal')).not.toBeInTheDocument())
  })

  it('cancelling the delete dialog keeps the photo', async () => {
    mockService.getByAppointment.mockResolvedValue([makePhotoDto()] as any)
    renderWithProviders(<PhotoSection {...professionalProps} />)

    await waitFor(() => expect(screen.getByTestId('photo-thumbnail-photo-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('photo-thumbnail-photo-uuid'))
    await userEvent.click(screen.getByTestId('photo-preview-delete-button'))
    await userEvent.click(screen.getByTestId('photo-delete-dialog-cancel'))

    expect(screen.queryByTestId('photo-delete-dialog')).not.toBeInTheDocument()
    expect(mockService.remove).not.toHaveBeenCalled()
  })
})
