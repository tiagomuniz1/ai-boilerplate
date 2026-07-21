jest.mock('../services/appointments.service')
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'clinic-slug'), useBasePath: () => '/clinic-slug' }))
jest.mock('next/navigation', () => ({ useRouter: jest.fn(() => ({ push: jest.fn() })) }))

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppointmentStatus, PatientGender, UserRole } from '@app/shared'
import { useRouter } from 'next/navigation'
import { appointmentsService } from '../services/appointments.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { AppointmentDetailsDialog } from './appointment-details-dialog'

const mockAppointmentsService = appointmentsService as jest.Mocked<typeof appointmentsService>
const mockUseRouter = useRouter as jest.Mock

const makeAppointmentDto = (overrides: object = {}) => ({
  id: 'appt-uuid',
  professionalId: 'doctor-uuid',
  professionalName: 'Dr. Test',
  patientId: 'patient-uuid',
  patientName: 'Patient One',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  scheduleId: 'schedule-uuid',
  date: '2025-06-10',
  startTime: '09:00',
  endTime: '09:30',
  status: AppointmentStatus.SCHEDULED,
  insuranceType: null,
  reason: null,
  cancellationReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  patient: {
    fullName: 'Patient One',
    email: 'patient@example.com',
    phoneNumber: '11999990000',
    birthDate: '1990-01-01',
    documentNumber: '12345678901',
    gender: PatientGender.FEMALE,
  },
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
    mockUseRouter.mockReturnValue({ push: jest.fn() })
  })

  it('does not render when closed', () => {
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} isOpen={false} />)
    expect(screen.queryByTestId('appointment-details-dialog')).not.toBeInTheDocument()
  })

  it('does not fetch when appointmentId is null (initial closed state)', () => {
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} appointmentId={null} isOpen={false} />)
    expect(mockAppointmentsService.getById).not.toHaveBeenCalled()
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

  it('renders appointment summary after loading', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('details-patient')).toBeInTheDocument()
    })
    expect(screen.getByTestId('details-patient')).toHaveTextContent('Patient One')
    expect(screen.getByTestId('details-professional')).toHaveTextContent('Dr. Test')
    expect(screen.getByTestId('details-date')).toHaveTextContent('10/06/2025')
    expect(screen.getByTestId('details-time')).toHaveTextContent('09:00')
    expect(screen.getByTestId('details-status-badge')).toHaveTextContent('Agendada')
  })

  it('shows "Ir para a consulta" button', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('go-to-appointment-button')).toBeInTheDocument()
    })
  })

  it('clicking "Ir para a consulta" navigates to appointment detail and closes dialog', async () => {
    const pushMock = jest.fn()
    mockUseRouter.mockReturnValue({ push: pushMock })
    const onClose = jest.fn()
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} onClose={onClose} />)
    await waitFor(() => expect(screen.getByTestId('go-to-appointment-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('go-to-appointment-button'))
    expect(pushMock).toHaveBeenCalledWith('/clinic-slug/appointments/appt-uuid')
    expect(onClose).toHaveBeenCalled()
  })

  it('renders reason when appointment has a reason', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto({ reason: 'Dor de cabeça' }))
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('details-reason')).toHaveTextContent('Dor de cabeça')
    })
  })

  it('renders cancellationReason when appointment is cancelled', async () => {
    mockAppointmentsService.getById.mockResolvedValue(
      makeAppointmentDto({
        status: AppointmentStatus.CANCELLED,
        cancellationReason: 'Paciente desmarcou',
      }),
    )
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('details-cancellation-reason')).toHaveTextContent('Paciente desmarcou')
    })
  })

  it('does not render cancel button', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('details-patient')).toBeInTheDocument())
    expect(screen.queryByTestId('details-cancel-button')).not.toBeInTheDocument()
  })

  it('does not render complete button', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('details-patient')).toBeInTheDocument())
    expect(screen.queryByTestId('details-complete-button')).not.toBeInTheDocument()
  })

  it('does not render fill-medical-record button', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailsDialog {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('details-patient')).toBeInTheDocument())
    expect(screen.queryByTestId('fill-medical-record-button')).not.toBeInTheDocument()
  })
})
