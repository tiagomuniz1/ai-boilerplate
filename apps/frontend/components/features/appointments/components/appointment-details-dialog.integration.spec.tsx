jest.mock('../services/appointments.service')
jest.mock('@/components/features/medical-records/services/medical-records.service')
jest.mock('@/components/features/medical-record-templates/services/medical-record-templates.service')
jest.mock('next/navigation', () => ({ useRouter: jest.fn(() => ({ push: jest.fn() })) }))

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppointmentStatus, UserRole } from '@app/shared'
import { appointmentsService } from '../services/appointments.service'
import { medicalRecordsService } from '@/components/features/medical-records/services/medical-records.service'
import { medicalRecordTemplatesService } from '@/components/features/medical-record-templates/services/medical-record-templates.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { AppointmentDetailsDialog } from './appointment-details-dialog'

const mockAppointmentsService = appointmentsService as jest.Mocked<typeof appointmentsService>
const mockMedicalRecordsService = medicalRecordsService as jest.Mocked<typeof medicalRecordsService>
const mockTemplatesService = medicalRecordTemplatesService as jest.Mocked<typeof medicalRecordTemplatesService>

const makeAppointmentDto = (overrides: object = {}) => ({
  id: 'appt-uuid',
  doctorId: 'doctor-uuid',
  doctorName: 'Dr. Test',
  patientId: 'patient-uuid',
  patientName: 'Patient One',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  scheduleId: 'schedule-uuid',
  date: '2025-06-10',
  startTime: '09:00',
  endTime: '09:30',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const defaultProps = {
  appointmentId: 'appt-uuid',
  isOpen: true,
  onClose: jest.fn(),
  role: UserRole.ADMIN,
  currentDoctorId: undefined as string | undefined,
}

describe('AppointmentDetailsDialog (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockMedicalRecordsService.getByAppointment.mockResolvedValue(null)
    mockTemplatesService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 1 })
  })

  it('does not render when closed', () => {
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} isOpen={false} />)
    expect(screen.queryByTestId('appointment-details-dialog')).not.toBeInTheDocument()
  })

  it('renders loading state', () => {
    mockAppointmentsService.getById.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)
    expect(screen.getByTestId('details-loading')).toBeInTheDocument()
  })

  it('renders error state when fetch fails', async () => {
    mockAppointmentsService.getById.mockRejectedValue({ status: 404 })
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('details-error')).toBeInTheDocument()
    })
  })

  it('renders appointment details for SCHEDULED appointment', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('details-patient')).toBeInTheDocument()
    })

    expect(screen.getByTestId('details-patient')).toHaveTextContent('Patient One')
    expect(screen.getByTestId('details-doctor')).toHaveTextContent('Dr. Test')
    expect(screen.getByTestId('details-status-badge')).toHaveTextContent('Agendada')
  })

  it('shows cancel and complete buttons for ADMIN on SCHEDULED appointment', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('details-cancel-button')).toBeInTheDocument()
    })

    expect(screen.getByTestId('details-complete-button')).toBeInTheDocument()
  })

  it('hides action buttons for CANCELLED appointment', async () => {
    mockAppointmentsService.getById.mockResolvedValue(
      makeAppointmentDto({ status: AppointmentStatus.CANCELLED }),
    )
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('details-status-badge')).toHaveTextContent('Cancelada')
    })

    expect(screen.queryByTestId('details-cancel-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('details-complete-button')).not.toBeInTheDocument()
  })

  it('hides action buttons for COMPLETED appointment', async () => {
    mockAppointmentsService.getById.mockResolvedValue(
      makeAppointmentDto({ status: AppointmentStatus.COMPLETED }),
    )
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('details-status-badge')).toHaveTextContent('Concluída')
    })

    expect(screen.queryByTestId('details-cancel-button')).not.toBeInTheDocument()
  })

  it('DOCTOR sees actions for own appointment', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto({ doctorId: 'my-doctor-id' }))
    renderWithProviders(
      <AppointmentDetailsDialog
        {...defaultProps}
        role={UserRole.DOCTOR}
        currentDoctorId="my-doctor-id"
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('details-cancel-button')).toBeInTheDocument()
    })
  })

  it('DOCTOR does not see actions for another doctor appointment', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto({ doctorId: 'other-doctor' }))
    renderWithProviders(
      <AppointmentDetailsDialog
        {...defaultProps}
        role={UserRole.DOCTOR}
        currentDoctorId="my-doctor-id"
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('details-patient')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('details-cancel-button')).not.toBeInTheDocument()
  })

  it('USER sees no action buttons', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} role={UserRole.USER} />)

    await waitFor(() => {
      expect(screen.getByTestId('details-patient')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('details-cancel-button')).not.toBeInTheDocument()
  })

  it('clicking cancel button opens CancelAppointmentDialog', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('details-cancel-button')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('details-cancel-button'))

    expect(screen.getByTestId('cancel-appointment-dialog')).toBeInTheDocument()
  })

  it('clicking complete calls complete use-case', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    mockAppointmentsService.complete.mockResolvedValue(
      makeAppointmentDto({ status: AppointmentStatus.COMPLETED }),
    )
    mockAppointmentsService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 })
    mockAppointmentsService.getAvailability.mockResolvedValue({
      doctorId: 'doctor-uuid',
      date: '2025-06-10',
      slots: [],
    })

    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('details-complete-button')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('details-complete-button'))

    await waitFor(() => {
      expect(mockAppointmentsService.complete).toHaveBeenCalledWith('appt-uuid')
    })
  })

  it('shows 422 error message when complete fails with 422', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    mockAppointmentsService.complete.mockRejectedValue({ status: 422, title: 'Unprocessable' })
    mockAppointmentsService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 })
    mockAppointmentsService.getAvailability.mockResolvedValue({ doctorId: 'doctor-uuid', date: '2025-06-10', slots: [] })

    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('details-complete-button')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('details-complete-button'))

    await waitFor(() => {
      expect(screen.getByTestId('details-complete-error')).toBeInTheDocument()
    })

    expect(screen.getByTestId('details-complete-error')).toHaveTextContent('consulta futura')
  })

  it('shows generic error message when complete fails with non-422 error', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    mockAppointmentsService.complete.mockRejectedValue({ status: 500, title: 'Server Error' })
    mockAppointmentsService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 })
    mockAppointmentsService.getAvailability.mockResolvedValue({ doctorId: 'doctor-uuid', date: '2025-06-10', slots: [] })

    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('details-complete-button')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('details-complete-button'))

    await waitFor(() => {
      expect(screen.getByTestId('details-complete-error')).toBeInTheDocument()
    })

    expect(screen.getByTestId('details-complete-error')).toHaveTextContent('Ocorreu um erro ao concluir')
  })

  it('confirming cancel dialog calls cancel and closes both dialogs', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    mockAppointmentsService.cancel.mockResolvedValue(
      makeAppointmentDto({ status: AppointmentStatus.CANCELLED }),
    )
    mockAppointmentsService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 })
    mockAppointmentsService.getAvailability.mockResolvedValue({ doctorId: 'doctor-uuid', date: '2025-06-10', slots: [] })

    const onClose = jest.fn()
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} onClose={onClose} />)

    await waitFor(() => {
      expect(screen.getByTestId('details-cancel-button')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('details-cancel-button'))
    expect(screen.getByTestId('cancel-appointment-dialog')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('cancel-dialog-confirm'))

    await waitFor(() => {
      expect(mockAppointmentsService.cancel).toHaveBeenCalledWith('appt-uuid', expect.any(Object))
    })
  })

  it('closing cancel dialog without confirming hides it', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('details-cancel-button')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('details-cancel-button'))
    expect(screen.getByTestId('cancel-appointment-dialog')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('cancel-dialog-cancel'))

    await waitFor(() => {
      expect(screen.queryByTestId('cancel-appointment-dialog')).not.toBeInTheDocument()
    })
  })

  it('renders reason when appointment has a reason', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto({ reason: 'Dor de cabeça' }))
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('details-reason')).toBeInTheDocument()
    })

    expect(screen.getByTestId('details-reason')).toHaveTextContent('Dor de cabeça')
  })

  it('renders cancellationReason when appointment has cancellation reason', async () => {
    mockAppointmentsService.getById.mockResolvedValue(
      makeAppointmentDto({ status: AppointmentStatus.CANCELLED, cancellationReason: 'Paciente desmarcou' }),
    )
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('details-cancellation-reason')).toBeInTheDocument()
    })

    expect(screen.getByTestId('details-cancellation-reason')).toHaveTextContent('Paciente desmarcou')
  })

  it('shows fill-medical-record button for ADMIN when no record exists', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    mockMedicalRecordsService.getByAppointment.mockResolvedValue(null)

    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument()
    })
  })

  it('does not show fill-medical-record button for USER role', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    mockMedicalRecordsService.getByAppointment.mockResolvedValue(null)

    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} role={UserRole.USER} />)

    await waitFor(() => {
      expect(screen.getByTestId('details-patient')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('fill-medical-record-button')).not.toBeInTheDocument()
  })

  it('shows view-medical-record button when record exists', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    mockMedicalRecordsService.getByAppointment.mockResolvedValue({
      id: 'record-uuid',
      appointmentId: 'appt-uuid',
      patientId: 'patient-uuid',
      patientName: 'Patient One',
      doctorId: 'doctor-uuid',
      doctorName: 'Dr. Test',
      specialtyId: 'spec-uuid',
      specialtyName: 'Cardiologia',
      templateId: 'tpl-uuid',
      templateSchemaSnapshot: [],
      data: {},
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('view-medical-record-button')).toBeInTheDocument()
    })
  })
})
