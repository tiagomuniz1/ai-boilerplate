jest.mock('../services/consultation-photos.service')
jest.mock('../use-cases/fetch-consultation-photo-blob.use-case')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { consultationPhotosService } from '../services/consultation-photos.service'
import { fetchConsultationPhotoBlobUseCase } from '../use-cases/fetch-consultation-photo-blob.use-case'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PatientPhotoGallery } from './patient-photo-gallery'

const mockService = consultationPhotosService as jest.Mocked<typeof consultationPhotosService>
const mockFetchBlob = fetchConsultationPhotoBlobUseCase as jest.Mock

const makeGalleryDto = (overrides: object = {}) => ({
  id: 'photo-uuid',
  appointmentId: 'appointment-uuid',
  fileName: 'evolucao.jpg',
  mimeType: 'image/jpeg',
  fileSizeBytes: 1000,
  createdAt: '2026-01-05T10:00:00.000Z',
  professionalName: 'Ana Nutri',
  appointmentDate: '2026-01-04T00:00:00.000Z',
  ...overrides,
})

describe('PatientPhotoGallery (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url')
    global.URL.revokeObjectURL = jest.fn()
    mockFetchBlob.mockReturnValue(new Promise(() => {}))
  })

  it('shows skeleton while loading', () => {
    mockService.getByPatient.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<PatientPhotoGallery patientId="patient-uuid" />)
    expect(screen.getByTestId('photo-grid-skeleton')).toBeInTheDocument()
  })

  it('shows error state when fetch fails', async () => {
    mockService.getByPatient.mockRejectedValue(new Error('Network error'))
    renderWithProviders(<PatientPhotoGallery patientId="patient-uuid" />)
    await waitFor(() => {
      expect(screen.getByTestId('patient-photo-gallery-error')).toBeInTheDocument()
    })
  })

  it('shows empty message when there are no photos', async () => {
    mockService.getByPatient.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 } as any)
    renderWithProviders(<PatientPhotoGallery patientId="patient-uuid" />)
    await waitFor(() => {
      expect(screen.getByTestId('patient-photo-gallery-empty')).toHaveTextContent(
        'Nenhuma foto registrada para este paciente ainda.',
      )
    })
  })

  it('renders the grid with professionalName per item', async () => {
    mockService.getByPatient.mockResolvedValue({
      data: [makeGalleryDto()],
      total: 1,
      page: 1,
      limit: 20,
    } as any)
    renderWithProviders(<PatientPhotoGallery patientId="patient-uuid" />)

    await waitFor(() => {
      expect(screen.getByTestId('patient-photo-gallery-grid')).toBeInTheDocument()
    })
    expect(screen.getByTestId('photo-thumbnail-photo-uuid')).toBeInTheDocument()
    expect(screen.getByTestId('patient-photo-gallery-item-professional-photo-uuid')).toHaveTextContent('Ana Nutri')
  })

  it('does not show pagination when everything fits on one page', async () => {
    mockService.getByPatient.mockResolvedValue({
      data: [makeGalleryDto()],
      total: 1,
      page: 1,
      limit: 20,
    } as any)
    renderWithProviders(<PatientPhotoGallery patientId="patient-uuid" />)

    await waitFor(() => expect(screen.getByTestId('patient-photo-gallery-grid')).toBeInTheDocument())
    expect(screen.queryByTestId('patient-photo-gallery-page-info')).not.toBeInTheDocument()
  })

  it('shows pagination and navigates to the next page', async () => {
    mockService.getByPatient
      .mockResolvedValueOnce({ data: [makeGalleryDto({ id: 'photo-1' })], total: 25, page: 1, limit: 20 } as any)
      .mockResolvedValueOnce({ data: [makeGalleryDto({ id: 'photo-2' })], total: 25, page: 2, limit: 20 } as any)

    renderWithProviders(<PatientPhotoGallery patientId="patient-uuid" />)

    await waitFor(() => expect(screen.getByTestId('patient-photo-gallery-page-info')).toHaveTextContent('1 / 2'))
    expect(screen.getByTestId('patient-photo-gallery-prev-page')).toBeDisabled()

    await userEvent.click(screen.getByTestId('patient-photo-gallery-next-page'))

    await waitFor(() => expect(screen.getByTestId('photo-thumbnail-photo-2')).toBeInTheDocument())
    expect(screen.getByTestId('patient-photo-gallery-page-info')).toHaveTextContent('2 / 2')
    expect(screen.getByTestId('patient-photo-gallery-next-page')).toBeDisabled()
  })

  it('opens the preview modal without a delete button when a thumbnail is clicked', async () => {
    mockService.getByPatient.mockResolvedValue({
      data: [makeGalleryDto()],
      total: 1,
      page: 1,
      limit: 20,
    } as any)
    renderWithProviders(<PatientPhotoGallery patientId="patient-uuid" />)

    await waitFor(() => expect(screen.getByTestId('photo-thumbnail-photo-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('photo-thumbnail-photo-uuid'))

    expect(screen.getByTestId('photo-preview-modal')).toBeInTheDocument()
    expect(screen.queryByTestId('photo-preview-delete-button')).not.toBeInTheDocument()
  })

  it('navigates between photos in the preview using the next/previous arrows', async () => {
    mockService.getByPatient.mockResolvedValue({
      data: [
        makeGalleryDto({ id: 'photo-1', fileName: 'a.jpg' }),
        makeGalleryDto({ id: 'photo-2', fileName: 'b.jpg' }),
      ],
      total: 2,
      page: 1,
      limit: 20,
    } as any)
    renderWithProviders(<PatientPhotoGallery patientId="patient-uuid" />)

    await waitFor(() => expect(screen.getByTestId('photo-thumbnail-photo-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('photo-thumbnail-photo-1'))

    expect(screen.queryByTestId('photo-preview-previous-button')).not.toBeInTheDocument()
    expect(screen.getByTestId('photo-preview-next-button')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('photo-preview-next-button'))

    expect(screen.getByTestId('photo-preview-previous-button')).toBeInTheDocument()
    expect(screen.queryByTestId('photo-preview-next-button')).not.toBeInTheDocument()
  })
})
