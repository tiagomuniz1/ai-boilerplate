jest.mock('../services/exams.service')
jest.mock('../use-cases/download-exam-request-pdf.use-case')
jest.mock('../use-cases/download-exam-result-file.use-case')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExamRequestStatus, UserRole } from '@app/shared'
import { examsService } from '../services/exams.service'
import { downloadExamRequestPdfUseCase } from '../use-cases/download-exam-request-pdf.use-case'
import { downloadExamResultFileUseCase } from '../use-cases/download-exam-result-file.use-case'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ExameSection } from './exame-section'

const mockExamsService = examsService as jest.Mocked<typeof examsService>
const mockDownload = downloadExamRequestPdfUseCase as jest.Mock
const mockDownloadResultFile = downloadExamResultFileUseCase as jest.Mock

const makeExamRequestDto = (overrides: object = {}) => ({
  id: 'exam-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Maria Santos',
  doctorId: 'doctor-uuid',
  doctorName: 'Dr. João',
  items: [{ name: 'Hemograma completo', observations: 'Jejum de 8 horas' }],
  notes: null,
  status: ExamRequestStatus.REQUESTED,
  results: [],
  issuedAt: '2026-06-28T10:00:00.000Z',
  createdAt: '2026-06-28T10:00:00.000Z',
  ...overrides,
})

const makeResultDto = (overrides: object = {}) => ({
  id: 'result-uuid',
  examRequestId: 'exam-uuid',
  fileName: 'hemograma.pdf',
  mimeType: 'application/pdf',
  fileSizeBytes: 1024,
  createdAt: '2026-06-29T10:00:00.000Z',
  ...overrides,
})

const doctorProps = { appointmentId: 'appt-uuid', canManage: true, userRole: UserRole.DOCTOR }
const adminProps = { appointmentId: 'appt-uuid', canManage: true, userRole: UserRole.ADMIN }

describe('ExameSection (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDownload.mockResolvedValue(undefined)
    mockDownloadResultFile.mockResolvedValue(undefined)
  })

  it('shows skeleton while loading', () => {
    mockExamsService.getByAppointment.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<ExameSection {...doctorProps} />)
    expect(screen.getByTestId('exame-list-skeleton')).toBeInTheDocument()
  })

  it('shows error state when fetch fails', async () => {
    mockExamsService.getByAppointment.mockRejectedValue(new Error('Network error'))
    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('exame-section-error')).toBeInTheDocument()
    })
  })

  it('shows empty message when no exam requests', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('exame-section-empty')).toHaveTextContent('Nenhum exame solicitado.')
    })
  })

  it('renders a compact row with date, status badge and summary', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([makeExamRequestDto()] as any)
    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('exame-item-exam-uuid')).toBeInTheDocument()
    })
    expect(screen.getByTestId('exame-item-date-exam-uuid')).toBeInTheDocument()
    expect(screen.getByTestId('exame-item-status-exam-uuid')).toHaveTextContent('Solicitado')
    expect(screen.getByTestId('exame-item-summary-exam-uuid')).toHaveTextContent('1 exame')
    expect(screen.getByTestId('exame-item-summary-exam-uuid')).toHaveTextContent('nenhum resultado anexado')
  })

  it('shows the results count in the summary when results are attached', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([
      makeExamRequestDto({ status: ExamRequestStatus.COMPLETED, results: [makeResultDto()] }),
    ] as any)
    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('exame-item-summary-exam-uuid')).toHaveTextContent('1 resultado anexado')
    })
  })

  it('shows "Concluído" badge when status is completed', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([
      makeExamRequestDto({ status: ExamRequestStatus.COMPLETED }),
    ] as any)
    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('exame-item-status-exam-uuid')).toHaveTextContent('Concluído')
    })
  })

  it('shows "Novo pedido de exames" button for DOCTOR with canManage', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('exame-new-button')).toBeInTheDocument()
    })
  })

  it('does not show "Novo pedido de exames" button for ADMIN', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<ExameSection {...adminProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('exame-section-empty')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('exame-new-button')).not.toBeInTheDocument()
  })

  it('does not show "Novo pedido de exames" button when canManage is false', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<ExameSection {...doctorProps} canManage={false} />)
    await waitFor(() => {
      expect(screen.getByTestId('exame-section-empty')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('exame-new-button')).not.toBeInTheDocument()
  })

  it('shows delete button for ADMIN and DOCTOR when canManage', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([makeExamRequestDto()] as any)
    renderWithProviders(<ExameSection {...adminProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('exame-delete-button-exam-uuid')).toBeInTheDocument()
    })
  })

  it('does not show delete button when canManage is false', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([makeExamRequestDto()] as any)
    renderWithProviders(<ExameSection {...doctorProps} canManage={false} />)
    await waitFor(() => {
      expect(screen.getByTestId('exame-item-exam-uuid')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('exame-delete-button-exam-uuid')).not.toBeInTheDocument()
  })

  it('opens form modal when "Novo pedido de exames" is clicked', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('exame-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('exame-new-button'))
    await waitFor(() => {
      expect(screen.getByTestId('exame-form-modal')).toBeInTheDocument()
    })
  })

  it('submits new exam request and calls examsService.create', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([])
    mockExamsService.create.mockResolvedValue(makeExamRequestDto() as any)

    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('exame-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('exame-new-button'))
    await waitFor(() => expect(screen.getByTestId('exame-form')).toBeInTheDocument())

    await userEvent.type(screen.getByTestId('exame-form-item-name-0'), 'Hemograma completo')
    await userEvent.click(screen.getByTestId('exame-form-submit'))

    await waitFor(() => {
      expect(mockExamsService.create).toHaveBeenCalled()
    })
  })

  it('shows 403 error message when create fails with 403', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([])
    mockExamsService.create.mockRejectedValue({ status: 403 })

    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('exame-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('exame-new-button'))
    await waitFor(() => expect(screen.getByTestId('exame-form')).toBeInTheDocument())

    await userEvent.type(screen.getByTestId('exame-form-item-name-0'), 'Hemograma completo')
    await userEvent.click(screen.getByTestId('exame-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('exame-form-error')).toHaveTextContent('permissão')
    })
  })

  it('shows 422 error message when create fails with 422', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([])
    mockExamsService.create.mockRejectedValue({ status: 422 })

    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('exame-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('exame-new-button'))
    await waitFor(() => expect(screen.getByTestId('exame-form')).toBeInTheDocument())

    await userEvent.type(screen.getByTestId('exame-form-item-name-0'), 'Hemograma completo')
    await userEvent.click(screen.getByTestId('exame-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('exame-form-error')).toHaveTextContent('cancelada')
    })
  })

  it('shows generic error message when create fails with unknown status', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([])
    mockExamsService.create.mockRejectedValue({ status: 500 })

    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('exame-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('exame-new-button'))
    await waitFor(() => expect(screen.getByTestId('exame-form')).toBeInTheDocument())

    await userEvent.type(screen.getByTestId('exame-form-item-name-0'), 'Hemograma completo')
    await userEvent.click(screen.getByTestId('exame-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('exame-form-error')).toHaveTextContent('Ocorreu um erro')
    })
  })

  it('opens delete dialog on delete button click and calls remove on confirm', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([makeExamRequestDto()] as any)
    mockExamsService.remove.mockResolvedValue(undefined as any)
    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('exame-delete-button-exam-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('exame-delete-button-exam-uuid'))
    await waitFor(() => expect(screen.getByTestId('exame-delete-dialog')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('exame-delete-dialog-confirm'))
    await waitFor(() => {
      expect(mockExamsService.remove).toHaveBeenCalledWith('exam-uuid')
    })
  })

  it('closes delete dialog on cancel click', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([makeExamRequestDto()] as any)
    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('exame-delete-button-exam-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('exame-delete-button-exam-uuid'))
    await waitFor(() => expect(screen.getByTestId('exame-delete-dialog')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('exame-delete-dialog-cancel'))
    await waitFor(() => {
      expect(screen.queryByTestId('exame-delete-dialog')).not.toBeInTheDocument()
    })
  })

  it('shows download button and calls use-case when clicked', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([makeExamRequestDto()] as any)
    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('exame-download-button-exam-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('exame-download-button-exam-uuid'))
    await waitFor(() => {
      expect(mockDownload).toHaveBeenCalledWith('exam-uuid', 'pedido-exames-exam-uuid.pdf')
    })
  })

  it('only shows download loading state on the item currently being downloaded', async () => {
    const first = makeExamRequestDto({ id: 'exam-1' })
    const second = makeExamRequestDto({ id: 'exam-2' })
    mockExamsService.getByAppointment.mockResolvedValue([first, second] as any)
    let resolveDownload: () => void
    mockDownload.mockReturnValue(new Promise((resolve) => { resolveDownload = resolve as () => void }))

    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('exame-download-button-exam-1')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('exame-download-button-exam-1'))

    await waitFor(() => {
      expect(screen.getByTestId('exame-download-button-exam-1')).toHaveAttribute('aria-busy', 'true')
    })
    expect(screen.getByTestId('exame-download-button-exam-2')).toHaveAttribute('aria-busy', 'false')

    resolveDownload!()
  })

  it('opens the preview modal with the selected exam request when "Visualizar" is clicked', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([makeExamRequestDto()] as any)
    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('exame-preview-button-exam-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('exame-preview-button-exam-uuid'))
    await waitFor(() => {
      expect(screen.getByTestId('exame-preview-modal')).toBeInTheDocument()
    })
    expect(screen.getByTestId('exame-preview-doctor')).toHaveTextContent('Dr. João')
    expect(screen.getByTestId('exame-preview-item-0')).toHaveTextContent('Hemograma completo')
  })

  it('uploads a result file from within the preview modal and calls examsService.addResult', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([makeExamRequestDto()] as any)
    mockExamsService.addResult.mockResolvedValue(
      makeExamRequestDto({ status: ExamRequestStatus.COMPLETED, results: [makeResultDto()] }) as any,
    )

    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('exame-preview-button-exam-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('exame-preview-button-exam-uuid'))
    await waitFor(() => expect(screen.getByTestId('exame-result-upload-input')).toBeInTheDocument())

    const file = new File(['%PDF'], 'hemograma.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByTestId('exame-result-upload-input'), file)

    await waitFor(() => {
      expect(mockExamsService.addResult).toHaveBeenCalledWith('exam-uuid', [file])
    })
  })

  it('shows upload error alert inside the preview modal when addResult fails', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([makeExamRequestDto()] as any)
    mockExamsService.addResult.mockRejectedValue({ status: 422 })

    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('exame-preview-button-exam-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('exame-preview-button-exam-uuid'))
    await waitFor(() => expect(screen.getByTestId('exame-result-upload-input')).toBeInTheDocument())

    const file = new File(['%PDF'], 'hemograma.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByTestId('exame-result-upload-input'), file)

    await waitFor(() => {
      expect(screen.getByTestId('exame-preview-upload-error')).toHaveTextContent('tipo e o tamanho')
    })
  })

  it('opens the result delete dialog from within the preview modal and calls removeResult on confirm', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([
      makeExamRequestDto({ status: ExamRequestStatus.COMPLETED, results: [makeResultDto()] }),
    ] as any)
    mockExamsService.removeResult.mockResolvedValue(undefined as any)

    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('exame-preview-button-exam-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('exame-preview-button-exam-uuid'))
    await waitFor(() => expect(screen.getByTestId('exame-result-remove-result-uuid')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('exame-result-remove-result-uuid'))
    await waitFor(() => expect(screen.getByTestId('exame-result-delete-dialog')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('exame-result-delete-dialog-confirm'))

    await waitFor(() => {
      expect(mockExamsService.removeResult).toHaveBeenCalledWith('result-uuid')
    })
  })

  it('downloads a result file (through the authenticated use-case, never a direct link) when its name is clicked', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([
      makeExamRequestDto({ status: ExamRequestStatus.COMPLETED, results: [makeResultDto()] }),
    ] as any)

    renderWithProviders(<ExameSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('exame-preview-button-exam-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('exame-preview-button-exam-uuid'))
    await waitFor(() => expect(screen.getByTestId('exame-result-link-result-uuid')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('exame-result-link-result-uuid'))

    await waitFor(() => {
      expect(mockDownloadResultFile).toHaveBeenCalledWith('result-uuid', 'hemograma.pdf')
    })
  })

  it('does not show result remove control inside the preview modal for ADMIN', async () => {
    mockExamsService.getByAppointment.mockResolvedValue([
      makeExamRequestDto({ status: ExamRequestStatus.COMPLETED, results: [makeResultDto()] }),
    ] as any)

    renderWithProviders(<ExameSection {...adminProps} />)
    await waitFor(() => expect(screen.getByTestId('exame-preview-button-exam-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('exame-preview-button-exam-uuid'))
    await waitFor(() => expect(screen.getByTestId('exame-result-link-result-uuid')).toBeInTheDocument())

    expect(screen.queryByTestId('exame-result-remove-result-uuid')).not.toBeInTheDocument()
    expect(screen.queryByTestId('exame-result-upload-button')).not.toBeInTheDocument()
  })
})
