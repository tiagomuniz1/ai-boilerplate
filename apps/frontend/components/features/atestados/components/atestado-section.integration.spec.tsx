jest.mock('../services/atestados.service')
jest.mock('../use-cases/download-atestado-pdf.use-case')
jest.mock('@/components/features/professionals/hooks/use-professional.hook')

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MedicalCertificateType, UserRole } from '@app/shared'
import { atestadosService } from '../services/atestados.service'
import { downloadAtestadoPdfUseCase } from '../use-cases/download-atestado-pdf.use-case'
import { useProfessional } from '@/components/features/professionals/hooks/use-professional.hook'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { AtestadoSection } from './atestado-section'

const mockAtestadosService = atestadosService as jest.Mocked<typeof atestadosService>
const mockDownload = downloadAtestadoPdfUseCase as jest.Mock
const mockUseProfessional = useProfessional as jest.Mock

const makeAtestadoDto = (overrides: object = {}) => ({
  id: 'cert-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Maria Santos',
  professionalId: 'doctor-uuid',
  professionalName: 'Dr. João',
  type: MedicalCertificateType.LEAVE,
  daysOff: 3,
  startDate: '2026-01-05',
  cidCode: null,
  attendanceDate: null,
  checkInTime: null,
  checkOutTime: null,
  observations: null,
  issuedAt: '2026-06-28T10:00:00.000Z',
  createdAt: '2026-06-28T10:00:00.000Z',
  ...overrides,
})

const doctorProps = { appointmentId: 'appt-uuid', professionalId: 'doctor-uuid', canManage: true, userRole: UserRole.PROFESSIONAL }
const adminProps = { appointmentId: 'appt-uuid', professionalId: 'doctor-uuid', canManage: true, userRole: UserRole.ADMIN }

describe('AtestadoSection (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDownload.mockResolvedValue(undefined)
    mockUseProfessional.mockReturnValue({ data: undefined })
  })

  it('shows skeleton while loading', () => {
    mockAtestadosService.getByAppointment.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<AtestadoSection {...doctorProps} />)
    expect(screen.getByTestId('atestado-list-skeleton')).toBeInTheDocument()
  })

  it('shows error state when fetch fails', async () => {
    mockAtestadosService.getByAppointment.mockRejectedValue(new Error('Network error'))
    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('atestado-section-error')).toBeInTheDocument()
    })
  })

  it('shows empty message when no atestados', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('atestado-section-empty')).toHaveTextContent('Nenhum atestado emitido.')
    })
  })

  it('renders list of atestados with badge, type label and date', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([makeAtestadoDto()] as any)
    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('atestado-item-cert-uuid')).toBeInTheDocument()
    })
    expect(screen.getByTestId('atestado-item-badge-cert-uuid')).toHaveTextContent('Emitido')
    expect(screen.getByTestId('atestado-item-type-cert-uuid')).toHaveTextContent('Afastamento')
    expect(screen.getByTestId('atestado-item-type-cert-uuid')).toHaveTextContent('3 dias')
    const expectedDate = new Date('2026-01-05').toLocaleDateString('pt-BR')
    expect(screen.getByTestId('atestado-item-date-cert-uuid')).toHaveTextContent(expectedDate)
  })

  it('renders singular "dia" in title when daysOff is 1', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([makeAtestadoDto({ daysOff: 1 })] as any)
    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('atestado-item-type-cert-uuid')).toHaveTextContent('1 dia')
    })
    expect(screen.getByTestId('atestado-item-type-cert-uuid')).not.toHaveTextContent('1 dias')
  })

  it('renders CID in summary when present', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([makeAtestadoDto({ cidCode: 'M25.5' })] as any)
    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('atestado-item-summary-cert-uuid')).toHaveTextContent('CID M25.5')
    })
  })

  it('does not render summary line when there is no CID', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([makeAtestadoDto({ cidCode: null })] as any)
    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('atestado-item-cert-uuid')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('atestado-item-summary-cert-uuid')).not.toBeInTheDocument()
  })

  it('renders comparecimento title for ATTENDANCE type', async () => {
    const attendanceDto = makeAtestadoDto({
      type: MedicalCertificateType.ATTENDANCE,
      daysOff: null,
      startDate: null,
      attendanceDate: '2026-01-05',
      checkInTime: '08:00',
      checkOutTime: '08:30',
    })
    mockAtestadosService.getByAppointment.mockResolvedValue([attendanceDto] as any)
    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('atestado-item-type-cert-uuid')).toHaveTextContent('Comparecimento')
    })
    expect(screen.getByTestId('atestado-item-summary-cert-uuid')).toHaveTextContent('Entrada 08:00 · Saída 08:30')
  })

  it('shows "Novo atestado" button for DOCTOR with canManage', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('atestado-new-button')).toBeInTheDocument()
    })
  })

  it('does not show "Novo atestado" button for ADMIN', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<AtestadoSection {...adminProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('atestado-section-empty')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('atestado-new-button')).not.toBeInTheDocument()
  })

  it('does not show "Novo atestado" button when canManage is false', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<AtestadoSection {...doctorProps} canManage={false} />)
    await waitFor(() => {
      expect(screen.getByTestId('atestado-section-empty')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('atestado-new-button')).not.toBeInTheDocument()
  })

  it('shows delete button for ADMIN and DOCTOR when canManage', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([makeAtestadoDto()] as any)
    renderWithProviders(<AtestadoSection {...adminProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('atestado-delete-button-cert-uuid')).toBeInTheDocument()
    })
  })

  it('does not show delete button when canManage is false', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([makeAtestadoDto()] as any)
    renderWithProviders(<AtestadoSection {...doctorProps} canManage={false} />)
    await waitFor(() => {
      expect(screen.getByTestId('atestado-item-cert-uuid')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('atestado-delete-button-cert-uuid')).not.toBeInTheDocument()
  })

  it('opens form modal when "Novo atestado" is clicked', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('atestado-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('atestado-new-button'))
    await waitFor(() => {
      expect(screen.getByTestId('atestado-form-modal')).toBeInTheDocument()
    })
  })

  it('closes form modal when cancel (close) is clicked', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('atestado-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('atestado-new-button'))
    await waitFor(() => expect(screen.getByTestId('atestado-form-modal')).toBeInTheDocument())
    const modal = screen.getByTestId('atestado-form-modal')
    await userEvent.click(within(modal).getByRole('button', { name: 'Fechar' }))
    await waitFor(() => {
      expect(screen.queryByTestId('atestado-form-modal')).not.toBeInTheDocument()
    })
  })

  it('submitting LEAVE form calls atestadosService.create', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([])
    mockAtestadosService.create.mockResolvedValue(makeAtestadoDto() as any)

    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('atestado-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('atestado-new-button'))
    await waitFor(() => expect(screen.getByTestId('atestado-form')).toBeInTheDocument())

    await userEvent.type(screen.getByTestId('atestado-form-days-off'), '3')
    await userEvent.type(screen.getByTestId('atestado-form-start-date'), '2026-01-05')
    await userEvent.click(screen.getByTestId('atestado-form-submit'))

    await waitFor(() => {
      expect(mockAtestadosService.create).toHaveBeenCalled()
    })
  })

  it('submitting ATTENDANCE form calls atestadosService.create', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([])
    mockAtestadosService.create.mockResolvedValue(makeAtestadoDto({ type: MedicalCertificateType.ATTENDANCE }) as any)

    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('atestado-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('atestado-new-button'))
    await waitFor(() => expect(screen.getByTestId('atestado-form')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('atestado-form-type-attendance'))
    await userEvent.type(screen.getByTestId('atestado-form-attendance-date'), '2026-01-05')
    await userEvent.type(screen.getByTestId('atestado-form-check-in-time'), '08:00')
    await userEvent.type(screen.getByTestId('atestado-form-check-out-time'), '08:30')
    await userEvent.click(screen.getByTestId('atestado-form-submit'))

    await waitFor(() => {
      expect(mockAtestadosService.create).toHaveBeenCalled()
    })
  })

  it('shows 403 error when create fails with 403', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([])
    mockAtestadosService.create.mockRejectedValue({ status: 403 })

    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('atestado-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('atestado-new-button'))
    await waitFor(() => expect(screen.getByTestId('atestado-form')).toBeInTheDocument())

    await userEvent.type(screen.getByTestId('atestado-form-days-off'), '3')
    await userEvent.type(screen.getByTestId('atestado-form-start-date'), '2026-01-05')
    await userEvent.click(screen.getByTestId('atestado-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('atestado-form-error')).toHaveTextContent('permissão')
    })
  })

  it('shows generic error when create fails with unknown status', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([])
    mockAtestadosService.create.mockRejectedValue({ status: 500 })

    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('atestado-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('atestado-new-button'))
    await waitFor(() => expect(screen.getByTestId('atestado-form')).toBeInTheDocument())

    await userEvent.type(screen.getByTestId('atestado-form-days-off'), '3')
    await userEvent.type(screen.getByTestId('atestado-form-start-date'), '2026-01-05')
    await userEvent.click(screen.getByTestId('atestado-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('atestado-form-error')).toHaveTextContent('Ocorreu um erro')
    })
  })

  it('shows 422 error when create fails with 422', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([])
    mockAtestadosService.create.mockRejectedValue({ status: 422 })

    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('atestado-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('atestado-new-button'))
    await waitFor(() => expect(screen.getByTestId('atestado-form')).toBeInTheDocument())

    await userEvent.type(screen.getByTestId('atestado-form-days-off'), '3')
    await userEvent.type(screen.getByTestId('atestado-form-start-date'), '2026-01-05')
    await userEvent.click(screen.getByTestId('atestado-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('atestado-form-error')).toHaveTextContent('cancelada')
    })
  })

  it('opens delete dialog on delete button click', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([makeAtestadoDto()] as any)
    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('atestado-delete-button-cert-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('atestado-delete-button-cert-uuid'))
    await waitFor(() => {
      expect(screen.getByTestId('atestado-delete-dialog')).toBeInTheDocument()
    })
  })

  it('closes delete dialog on cancel click', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([makeAtestadoDto()] as any)
    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('atestado-delete-button-cert-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('atestado-delete-button-cert-uuid'))
    await waitFor(() => expect(screen.getByTestId('atestado-delete-dialog')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('atestado-delete-dialog-cancel'))
    await waitFor(() => {
      expect(screen.queryByTestId('atestado-delete-dialog')).not.toBeInTheDocument()
    })
  })

  it('calls atestadosService.remove when delete is confirmed', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([makeAtestadoDto()] as any)
    mockAtestadosService.remove.mockResolvedValue(undefined as any)
    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('atestado-delete-button-cert-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('atestado-delete-button-cert-uuid'))
    await waitFor(() => expect(screen.getByTestId('atestado-delete-dialog')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('atestado-delete-dialog-confirm'))
    await waitFor(() => {
      expect(mockAtestadosService.remove).toHaveBeenCalledWith('cert-uuid')
    })
  })

  it('shows download button and calls use-case when clicked', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([makeAtestadoDto()] as any)
    mockDownload.mockResolvedValue(undefined)
    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('atestado-download-button-cert-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('atestado-download-button-cert-uuid'))
    await waitFor(() => {
      expect(mockDownload).toHaveBeenCalledWith('cert-uuid', 'atestado-cert-uuid.pdf')
    })
  })

  it('only shows loading state on the item currently being downloaded', async () => {
    const first = makeAtestadoDto({ id: 'cert-1' })
    const second = makeAtestadoDto({ id: 'cert-2' })
    mockAtestadosService.getByAppointment.mockResolvedValue([first, second] as any)
    let resolveDownload: () => void
    mockDownload.mockReturnValue(new Promise((resolve) => { resolveDownload = resolve as () => void }))

    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('atestado-download-button-cert-1')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('atestado-download-button-cert-1'))

    await waitFor(() => {
      expect(screen.getByTestId('atestado-download-button-cert-1')).toHaveAttribute('aria-busy', 'true')
    })
    expect(screen.getByTestId('atestado-download-button-cert-2')).toHaveAttribute('aria-busy', 'false')

    resolveDownload!()
  })

  it('opens preview modal when "Visualizar" is clicked', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([makeAtestadoDto()] as any)
    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('atestado-preview-button-cert-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('atestado-preview-button-cert-uuid'))
    await waitFor(() => {
      expect(screen.getByTestId('atestado-preview-modal')).toBeInTheDocument()
    })
  })

  it('closes preview modal when closed', async () => {
    mockAtestadosService.getByAppointment.mockResolvedValue([makeAtestadoDto()] as any)
    renderWithProviders(<AtestadoSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('atestado-preview-button-cert-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('atestado-preview-button-cert-uuid'))
    await waitFor(() => expect(screen.getByTestId('atestado-preview-modal')).toBeInTheDocument())
    const modal = screen.getByTestId('atestado-preview-modal')
    await userEvent.click(within(modal).getByRole('button', { name: 'Fechar' }))
    await waitFor(() => {
      expect(screen.queryByTestId('atestado-preview-modal')).not.toBeInTheDocument()
    })
  })
})
