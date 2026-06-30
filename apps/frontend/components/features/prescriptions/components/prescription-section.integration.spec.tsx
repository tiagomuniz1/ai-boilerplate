jest.mock('../services/prescriptions.service')
jest.mock('@/components/features/medications/services/medications.service')
jest.mock('../use-cases/download-prescription-pdf.use-case')

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserRole } from '@app/shared'
import { prescriptionsService } from '../services/prescriptions.service'
import { medicationsService } from '@/components/features/medications/services/medications.service'
import { downloadPrescriptionPdfUseCase } from '../use-cases/download-prescription-pdf.use-case'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PrescriptionSection } from './prescription-section'

const mockPrescriptionsService = prescriptionsService as jest.Mocked<typeof prescriptionsService>
const mockMedicationsService = medicationsService as jest.Mocked<typeof medicationsService>
const mockDownload = downloadPrescriptionPdfUseCase as jest.Mock

const makePrescriptionDto = (overrides: object = {}) => ({
  id: 'rx-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Maria Santos',
  doctorId: 'doctor-uuid',
  doctorName: 'Dr. João',
  issuedAt: '2026-06-28T10:00:00.000Z',
  items: [
    { medicationId: 'med-uuid', name: 'Dipirona 500mg', activeIngredient: 'dipirona sódica', dosage: null, quantity: null, instructions: 'Tomar 1 cp 8/8h' },
  ],
  notes: null,
  createdAt: '2026-06-28T10:00:00.000Z',
  ...overrides,
})

const makeMedPage = (meds: object[] = []) => ({ data: meds, total: meds.length, page: 1, limit: 10 })
const makeMed = () => ({
  id: 'med-uuid',
  name: 'Dipirona 500mg',
  activeIngredient: 'dipirona sódica',
  regulatoryCategory: null,
  therapeuticClass: null,
  holderCompany: null,
  registrationNumber: null,
  registrationStatus: null,
  source: 'anvisa',
  isActive: true,
  createdAt: new Date().toISOString(),
})

const doctorProps = { appointmentId: 'appt-uuid', canManage: true, userRole: UserRole.DOCTOR }
const adminProps = { appointmentId: 'appt-uuid', canManage: true, userRole: UserRole.ADMIN }

describe('PrescriptionSection (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage() as any)
    mockDownload.mockResolvedValue(undefined)
  })

  it('shows skeleton while loading', () => {
    mockPrescriptionsService.getByAppointment.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<PrescriptionSection {...doctorProps} />)
    expect(screen.getByTestId('prescription-list-skeleton')).toBeInTheDocument()
  })

  it('shows error state when fetch fails', async () => {
    mockPrescriptionsService.getByAppointment.mockRejectedValue(new Error('Network error'))
    renderWithProviders(<PrescriptionSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-section-error')).toBeInTheDocument()
    })
  })

  it('shows empty message when no prescriptions', async () => {
    mockPrescriptionsService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<PrescriptionSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-section-empty')).toHaveTextContent('Nenhuma receita emitida.')
    })
  })

  it('renders list of prescriptions', async () => {
    mockPrescriptionsService.getByAppointment.mockResolvedValue([makePrescriptionDto()] as any)
    renderWithProviders(<PrescriptionSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-item-rx-uuid')).toBeInTheDocument()
    })
    expect(screen.getByTestId('prescription-item-count-rx-uuid')).toHaveTextContent('1 medicamento')
  })

  it('shows singular/plural correctly for multiple medications', async () => {
    const rx = makePrescriptionDto({
      items: [
        { medicationId: 'm1', name: 'Med 1', activeIngredient: null, instructions: 'Tomar 1 cp' },
        { medicationId: 'm2', name: 'Med 2', activeIngredient: null, instructions: 'Tomar 1 cp' },
      ],
    })
    mockPrescriptionsService.getByAppointment.mockResolvedValue([rx] as any)
    renderWithProviders(<PrescriptionSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-item-count-rx-uuid')).toHaveTextContent('2 medicamentos')
    })
  })

  it('shows "Nova receita" button for DOCTOR with canManage', async () => {
    mockPrescriptionsService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<PrescriptionSection {...doctorProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-new-button')).toBeInTheDocument()
    })
  })

  it('does not show "Nova receita" button for ADMIN', async () => {
    mockPrescriptionsService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<PrescriptionSection {...adminProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-section-empty')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('prescription-new-button')).not.toBeInTheDocument()
  })

  it('does not show "Nova receita" button when canManage is false', async () => {
    mockPrescriptionsService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<PrescriptionSection {...doctorProps} canManage={false} />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-section-empty')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('prescription-new-button')).not.toBeInTheDocument()
  })

  it('shows delete button for ADMIN and DOCTOR when canManage', async () => {
    mockPrescriptionsService.getByAppointment.mockResolvedValue([makePrescriptionDto()] as any)
    renderWithProviders(<PrescriptionSection {...adminProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-delete-button-rx-uuid')).toBeInTheDocument()
    })
  })

  it('does not show delete button when canManage is false', async () => {
    mockPrescriptionsService.getByAppointment.mockResolvedValue([makePrescriptionDto()] as any)
    renderWithProviders(<PrescriptionSection {...doctorProps} canManage={false} />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-item-rx-uuid')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('prescription-delete-button-rx-uuid')).not.toBeInTheDocument()
  })

  it('opens form modal when "Nova receita" is clicked', async () => {
    mockPrescriptionsService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<PrescriptionSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('prescription-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-new-button'))
    await waitFor(() => {
      expect(screen.getByTestId('prescription-form-modal')).toBeInTheDocument()
    })
  })

  it('closes form modal when cancel (close) is clicked', async () => {
    mockPrescriptionsService.getByAppointment.mockResolvedValue([])
    renderWithProviders(<PrescriptionSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('prescription-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-new-button'))
    await waitFor(() => expect(screen.getByTestId('prescription-form-modal')).toBeInTheDocument())
    const modal = screen.getByTestId('prescription-form-modal')
    await userEvent.click(within(modal).getByRole('button', { name: 'Fechar' }))
    await waitFor(() => {
      expect(screen.queryByTestId('prescription-form-modal')).not.toBeInTheDocument()
    })
  })

  it('submitting form calls prescriptionsService.create', async () => {
    mockPrescriptionsService.getByAppointment.mockResolvedValue([])
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    mockPrescriptionsService.create.mockResolvedValue(makePrescriptionDto() as any)

    renderWithProviders(<PrescriptionSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('prescription-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-new-button'))
    await waitFor(() => expect(screen.getByTestId('prescription-form')).toBeInTheDocument())

    await userEvent.type(screen.getByTestId('prescription-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-search-result-med-uuid'))

    await userEvent.type(screen.getByTestId('prescription-form-item-instructions-0'), 'Tomar 1 cp 8/8h')
    await userEvent.click(screen.getByTestId('prescription-form-submit'))

    await waitFor(() => {
      expect(mockPrescriptionsService.create).toHaveBeenCalled()
    })
  })

  it('shows 422 error when create fails with 422', async () => {
    mockPrescriptionsService.getByAppointment.mockResolvedValue([])
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    mockPrescriptionsService.create.mockRejectedValue({ status: 422 })

    renderWithProviders(<PrescriptionSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('prescription-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-new-button'))
    await waitFor(() => expect(screen.getByTestId('prescription-form')).toBeInTheDocument())

    await userEvent.type(screen.getByTestId('prescription-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-search-result-med-uuid'))

    await userEvent.type(screen.getByTestId('prescription-form-item-instructions-0'), 'Tomar 1 cp')
    await userEvent.click(screen.getByTestId('prescription-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('prescription-form-error')).toHaveTextContent('cancelada')
    })
  })

  it('opens delete dialog on delete button click', async () => {
    mockPrescriptionsService.getByAppointment.mockResolvedValue([makePrescriptionDto()] as any)
    renderWithProviders(<PrescriptionSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('prescription-delete-button-rx-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-delete-button-rx-uuid'))
    await waitFor(() => {
      expect(screen.getByTestId('prescription-delete-dialog')).toBeInTheDocument()
    })
  })

  it('closes delete dialog on cancel click', async () => {
    mockPrescriptionsService.getByAppointment.mockResolvedValue([makePrescriptionDto()] as any)
    renderWithProviders(<PrescriptionSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('prescription-delete-button-rx-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-delete-button-rx-uuid'))
    await waitFor(() => expect(screen.getByTestId('prescription-delete-dialog')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-delete-dialog-cancel'))
    await waitFor(() => {
      expect(screen.queryByTestId('prescription-delete-dialog')).not.toBeInTheDocument()
    })
  })

  it('calls prescriptionsService.remove when delete is confirmed', async () => {
    mockPrescriptionsService.getByAppointment.mockResolvedValue([makePrescriptionDto()] as any)
    mockPrescriptionsService.remove.mockResolvedValue(undefined as any)
    renderWithProviders(<PrescriptionSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('prescription-delete-button-rx-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-delete-button-rx-uuid'))
    await waitFor(() => expect(screen.getByTestId('prescription-delete-dialog')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-delete-dialog-confirm'))
    await waitFor(() => {
      expect(mockPrescriptionsService.remove).toHaveBeenCalledWith('rx-uuid')
    })
  })

  it('shows download button and calls use-case when clicked', async () => {
    mockPrescriptionsService.getByAppointment.mockResolvedValue([makePrescriptionDto()] as any)
    mockDownload.mockResolvedValue(undefined)
    renderWithProviders(<PrescriptionSection {...doctorProps} />)
    await waitFor(() => expect(screen.getByTestId('prescription-download-button-rx-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-download-button-rx-uuid'))
    await waitFor(() => {
      expect(mockDownload).toHaveBeenCalledWith('rx-uuid', 'receita-rx-uuid.pdf')
    })
  })
})
