jest.mock('../services/appointments.service')
jest.mock('@/components/features/patients/services/patients.service')
jest.mock('next/navigation', () => ({ useRouter: jest.fn(() => ({ push: jest.fn() })) }))

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppointmentStatus } from '@app/shared'
import { appointmentsService } from '../services/appointments.service'
import { patientsService } from '@/components/features/patients/services/patients.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { BookAppointmentDialog } from './book-appointment-dialog'

const mockAppointmentsService = appointmentsService as jest.Mocked<typeof appointmentsService>
const mockPatientsService = patientsService as jest.Mocked<typeof patientsService>

const PATIENT_UUID = '00000000-0000-4000-e000-000000000001'

const makePatientsResponse = (patients: { id: string; fullName: string }[] = []) => ({
  data: patients.map((p) => ({
    id: p.id,
    user: { id: '00000000-0000-4000-f000-000000000001', fullName: p.fullName, email: `test@test.com`, isActive: true },
    fullName: p.fullName,
    phoneNumber: '11999999999',
    birthDate: '1990-01-01',
    documentNumber: '12345678901',
    gender: 'male',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  total: patients.length,
  page: 1,
  limit: 200,
})

const makeAppointmentResponse = () => ({
  id: 'appt-new-uuid',
  doctorId: 'doctor-uuid',
  doctorName: 'Dr. Test',
  patientId: 'patient-uuid',
  patientName: 'Patient One',
  scheduleId: 'schedule-uuid',
  date: '2025-07-04',
  startTime: '09:00',
  endTime: '09:30',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  date: '2025-07-04',
  startTime: '09:00',
  endTime: '09:30',
  doctorId: 'doctor-uuid',
}

describe('BookAppointmentDialog (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPatientsService.getAll.mockResolvedValue(
      makePatientsResponse([{ id: PATIENT_UUID, fullName: 'Patient One' }]),
    )
  })

  it('renders dialog with date and time info', () => {
    renderWithProviders(<BookAppointmentDialog {...defaultProps} />)
    expect(screen.getByTestId('book-appointment-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('book-dialog-date')).toHaveTextContent('2025-07-04')
    expect(screen.getByTestId('book-dialog-time')).toHaveTextContent('09:00')
  })

  it('shows patient validation error when submitting without selecting patient', async () => {
    renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

    await userEvent.click(screen.getByTestId('book-dialog-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('book-dialog-patient-error')).toBeInTheDocument()
    })
  })

  it('calls book and closes on success', async () => {
    mockAppointmentsService.book.mockResolvedValue(makeAppointmentResponse())
    mockAppointmentsService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 })
    mockAppointmentsService.getAvailability.mockResolvedValue({
      doctorId: 'doctor-uuid',
      date: '2025-07-04',
      slots: [],
    })

    renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Patient One' })).toBeInTheDocument()
    })

    await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
    await userEvent.click(screen.getByTestId('book-dialog-submit'))

    await waitFor(() => {
      expect(mockAppointmentsService.book).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: PATIENT_UUID,
          date: '2025-07-04',
          startTime: '09:00',
        }),
      )
    })

    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('shows 409 conflict error alert', async () => {
    mockAppointmentsService.book.mockRejectedValue({ status: 409, title: 'Conflict' })

    renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Patient One' })).toBeInTheDocument()
    })

    await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
    await userEvent.click(screen.getByTestId('book-dialog-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('book-dialog-error')).toBeInTheDocument()
    })

    expect(screen.getByTestId('book-dialog-error')).toHaveTextContent('acabou de ser reservado')
  })

  it('shows 422 invalid slot error alert', async () => {
    mockAppointmentsService.book.mockRejectedValue({ status: 422, title: 'Unprocessable' })

    renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Patient One' })).toBeInTheDocument()
    })

    await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
    await userEvent.click(screen.getByTestId('book-dialog-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('book-dialog-error')).toBeInTheDocument()
    })

    expect(screen.getByTestId('book-dialog-error')).toHaveTextContent('inválido ou no passado')
  })

  it('does not render when isOpen is false', () => {
    renderWithProviders(<BookAppointmentDialog {...defaultProps} isOpen={false} />)
    expect(screen.queryByTestId('book-appointment-dialog')).not.toBeInTheDocument()
  })

  it('shows generic error alert when mutation fails with non-409/non-422 error', async () => {
    mockAppointmentsService.book.mockRejectedValue({ status: 500, title: 'Server Error' })

    renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Patient One' })).toBeInTheDocument()
    })

    await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
    await userEvent.click(screen.getByTestId('book-dialog-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('book-dialog-error')).toBeInTheDocument()
    })

    expect(screen.getByTestId('book-dialog-error')).toHaveTextContent('Ocorreu um erro ao agendar')
  })
})
