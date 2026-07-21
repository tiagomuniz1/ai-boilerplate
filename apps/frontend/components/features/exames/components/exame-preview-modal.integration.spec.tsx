import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExamRequestStatus } from '@app/shared'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ExamePreviewModal } from './exame-preview-modal'
import type { IExamRequestModel } from '../types/exam-request-model.types'

function makeExamRequest(overrides: Partial<IExamRequestModel> = {}): IExamRequestModel {
  return {
    id: 'exam-uuid',
    appointmentId: 'appt-uuid',
    patientId: 'patient-uuid',
    patientName: 'Maria Santos',
    professionalId: 'doctor-uuid',
    professionalName: 'Dr. João',
    items: [
      { name: 'Hemograma completo', observations: 'Jejum de 8 horas' },
      { name: 'Raio-X de tórax', observations: null },
    ],
    notes: 'Retornar em 7 dias',
    status: ExamRequestStatus.REQUESTED,
    results: [],
    issuedAt: new Date('2026-06-28T10:00:00.000Z'),
    createdAt: new Date('2026-06-28T10:00:00.000Z'),
    ...overrides,
  }
}

const defaultProps = {
  examRequest: makeExamRequest(),
  onClose: jest.fn(),
  canManageResults: true,
  isUploading: false,
  uploadError: null,
  onUpload: jest.fn(),
  onRemoveResult: jest.fn(),
  onDownloadResult: jest.fn(),
  isDownloadingResultId: null,
}

describe('ExamePreviewModal (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing when examRequest is null', () => {
    renderWithProviders(<ExamePreviewModal {...defaultProps} examRequest={null} />)
    expect(screen.queryByTestId('exame-preview-modal')).not.toBeInTheDocument()
  })

  it('renders doctor, date, patient and status', () => {
    renderWithProviders(<ExamePreviewModal {...defaultProps} />)
    expect(screen.getByTestId('exame-preview-doctor')).toHaveTextContent('Dr. João')
    expect(screen.getByTestId('exame-preview-patient')).toHaveTextContent('Maria Santos')
    expect(screen.getByTestId('exame-preview-status')).toHaveTextContent('Solicitado')
    expect(screen.getByTestId('exame-preview-date')).toBeInTheDocument()
  })

  it('shows "Concluído" status when completed', () => {
    renderWithProviders(
      <ExamePreviewModal {...defaultProps} examRequest={makeExamRequest({ status: ExamRequestStatus.COMPLETED })} />,
    )
    expect(screen.getByTestId('exame-preview-status')).toHaveTextContent('Concluído')
  })

  it('renders all requested items with observations when present', () => {
    renderWithProviders(<ExamePreviewModal {...defaultProps} />)
    expect(screen.getByTestId('exame-preview-item-0')).toHaveTextContent('Hemograma completo')
    expect(screen.getByTestId('exame-preview-item-0')).toHaveTextContent('Jejum de 8 horas')
    expect(screen.getByTestId('exame-preview-item-1')).toHaveTextContent('Raio-X de tórax')
  })

  it('renders general notes when present', () => {
    renderWithProviders(<ExamePreviewModal {...defaultProps} />)
    expect(screen.getByTestId('exame-preview-notes')).toHaveTextContent('Retornar em 7 dias')
  })

  it('does not render notes section when notes is null', () => {
    renderWithProviders(<ExamePreviewModal {...defaultProps} examRequest={makeExamRequest({ notes: null })} />)
    expect(screen.queryByTestId('exame-preview-notes')).not.toBeInTheDocument()
  })

  it('shows empty message when there are no results', () => {
    renderWithProviders(<ExamePreviewModal {...defaultProps} />)
    expect(screen.getByTestId('exame-preview-results-empty')).toBeInTheDocument()
  })

  it('renders results with file name and size', () => {
    const examRequest = makeExamRequest({
      status: ExamRequestStatus.COMPLETED,
      results: [
        {
          id: 'result-uuid',
          fileName: 'hemograma.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 2 * 1024 * 1024,
          createdAt: new Date(),
        },
      ],
    })
    renderWithProviders(<ExamePreviewModal {...defaultProps} examRequest={examRequest} />)
    expect(screen.getByTestId('exame-result-result-uuid')).toBeInTheDocument()
    expect(screen.getByTestId('exame-result-link-result-uuid')).toHaveTextContent('hemograma.pdf')
    expect(screen.getByText('2.0 MB')).toBeInTheDocument()
  })

  it('calls onDownloadResult (never a direct href to a file URL) when clicking the file name', async () => {
    const onDownloadResult = jest.fn()
    const examRequest = makeExamRequest({
      status: ExamRequestStatus.COMPLETED,
      results: [
        {
          id: 'result-uuid',
          fileName: 'hemograma.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 1024,
          createdAt: new Date(),
        },
      ],
    })
    renderWithProviders(
      <ExamePreviewModal {...defaultProps} examRequest={examRequest} onDownloadResult={onDownloadResult} />,
    )

    const trigger = screen.getByTestId('exame-result-link-result-uuid')
    expect(trigger.tagName).toBe('BUTTON')
    expect(trigger).not.toHaveAttribute('href')

    await userEvent.click(trigger)
    expect(onDownloadResult).toHaveBeenCalledWith('result-uuid', 'hemograma.pdf')
  })

  it('disables the file name button while that result is downloading', () => {
    const examRequest = makeExamRequest({
      status: ExamRequestStatus.COMPLETED,
      results: [
        {
          id: 'result-uuid',
          fileName: 'hemograma.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 1024,
          createdAt: new Date(),
        },
      ],
    })
    renderWithProviders(
      <ExamePreviewModal {...defaultProps} examRequest={examRequest} isDownloadingResultId="result-uuid" />,
    )

    expect(screen.getByTestId('exame-result-link-result-uuid')).toBeDisabled()
  })

  it('calls onRemoveResult when clicking Remover on a result', async () => {
    const onRemoveResult = jest.fn()
    const examRequest = makeExamRequest({
      status: ExamRequestStatus.COMPLETED,
      results: [
        {
          id: 'result-uuid',
          fileName: 'hemograma.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 1024,
          createdAt: new Date(),
        },
      ],
    })
    renderWithProviders(
      <ExamePreviewModal {...defaultProps} examRequest={examRequest} onRemoveResult={onRemoveResult} />,
    )

    await userEvent.click(screen.getByTestId('exame-result-remove-result-uuid'))
    expect(onRemoveResult).toHaveBeenCalledWith('result-uuid')
  })

  it('does not show remove control when canManageResults is false', () => {
    const examRequest = makeExamRequest({
      status: ExamRequestStatus.COMPLETED,
      results: [
        {
          id: 'result-uuid',
          fileName: 'hemograma.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 1024,
          createdAt: new Date(),
        },
      ],
    })
    renderWithProviders(
      <ExamePreviewModal {...defaultProps} examRequest={examRequest} canManageResults={false} />,
    )
    expect(screen.queryByTestId('exame-result-remove-result-uuid')).not.toBeInTheDocument()
  })

  it('shows the upload control when canManageResults is true', () => {
    renderWithProviders(<ExamePreviewModal {...defaultProps} />)
    expect(screen.getByTestId('exame-result-upload-button')).toBeInTheDocument()
  })

  it('does not show the upload control when canManageResults is false', () => {
    renderWithProviders(<ExamePreviewModal {...defaultProps} canManageResults={false} />)
    expect(screen.queryByTestId('exame-result-upload-button')).not.toBeInTheDocument()
  })

  it('calls onUpload with the selected files', async () => {
    const onUpload = jest.fn()
    renderWithProviders(<ExamePreviewModal {...defaultProps} onUpload={onUpload} />)

    const file = new File(['%PDF'], 'hemograma.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByTestId('exame-result-upload-input'), file)

    expect(onUpload).toHaveBeenCalledWith([file])
  })

  it('shows uploadError message when present', () => {
    renderWithProviders(<ExamePreviewModal {...defaultProps} uploadError="Arquivo inválido." />)
    expect(screen.getByTestId('exame-preview-upload-error')).toHaveTextContent('Arquivo inválido.')
  })

  it('reflects isUploading in the upload button state', () => {
    renderWithProviders(<ExamePreviewModal {...defaultProps} isUploading />)
    expect(screen.getByTestId('exame-result-upload-button')).toHaveAttribute('aria-busy', 'true')
  })
})
