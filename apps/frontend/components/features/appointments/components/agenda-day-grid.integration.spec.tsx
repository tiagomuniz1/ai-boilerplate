jest.mock('../services/appointments.service')
jest.mock('@/components/features/patients/services/patients.service')
jest.mock('@/components/features/schedule-exceptions/services/schedule-exceptions.service')
jest.mock('next/navigation', () => ({ useRouter: jest.fn(() => ({ push: jest.fn() })) }))

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppointmentStatus, UserRole } from '@app/shared'
import { appointmentsService } from '../services/appointments.service'
import { patientsService } from '@/components/features/patients/services/patients.service'
import { scheduleExceptionsService } from '@/components/features/schedule-exceptions/services/schedule-exceptions.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { AgendaDayGrid } from './agenda-day-grid'

const mockAppointmentsService = appointmentsService as jest.Mocked<typeof appointmentsService>
const mockPatientsService = patientsService as jest.Mocked<typeof patientsService>
const mockScheduleExceptionsService = scheduleExceptionsService as jest.Mocked<typeof scheduleExceptionsService>

const FUTURE_DATE = '2099-12-31'
const PAST_DATE = '2020-01-01'

const makeAvailabilityResponse = (
  slots: { startTime: string; endTime: string }[] = [],
  date = FUTURE_DATE,
) => ({
  doctorId: 'doctor-uuid',
  date,
  slots: slots.map((s) => ({
    ...s,
    scheduleId: 'schedule-uuid',
    slotDurationInMinutes: 30,
  })),
})

const makePaginatedAppointments = (appointments: object[] = []) => ({
  data: appointments,
  total: 0,
  page: 1,
  limit: 100,
})

const makeAppointmentDto = (overrides: object = {}) => ({
  id: 'appt-uuid',
  doctorId: 'doctor-uuid',
  doctorName: 'Dr. Test',
  patientId: 'patient-uuid',
  patientName: 'Patient One',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  scheduleId: 'schedule-uuid',
  date: FUTURE_DATE,
  startTime: '10:00',
  endTime: '10:30',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const defaultProps = {
  doctorId: 'doctor-uuid',
  date: FUTURE_DATE,
  role: UserRole.ADMIN,
}

describe('AgendaDayGrid (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPatientsService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 200 })
    mockScheduleExceptionsService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })
  })

  it('renders empty message when doctorId is null', () => {
    renderWithProviders(<AgendaDayGrid {...defaultProps} doctorId={null} />)
    expect(screen.getByTestId('agenda-empty-doctor')).toBeInTheDocument()
  })

  it('renders skeleton while loading', () => {
    mockAppointmentsService.getAvailability.mockReturnValue(new Promise(() => {}))
    mockAppointmentsService.getAll.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<AgendaDayGrid {...defaultProps} />)

    expect(screen.getByTestId('agenda-skeleton')).toBeInTheDocument()
  })

  it('renders error state when availability fails', async () => {
    mockAppointmentsService.getAvailability.mockRejectedValue({ status: 500 })
    mockAppointmentsService.getAll.mockResolvedValue(makePaginatedAppointments())

    renderWithProviders(<AgendaDayGrid {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('agenda-day-error')).toBeInTheDocument()
    })
  })

  it('renders empty state when no slots exist', async () => {
    mockAppointmentsService.getAvailability.mockResolvedValue(makeAvailabilityResponse([]))
    mockAppointmentsService.getAll.mockResolvedValue(makePaginatedAppointments())

    renderWithProviders(<AgendaDayGrid {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('agenda-day-empty')).toBeInTheDocument()
    })
  })

  it('renders free slot', async () => {
    mockAppointmentsService.getAvailability.mockResolvedValue(
      makeAvailabilityResponse([{ startTime: '09:00', endTime: '09:30' }]),
    )
    mockAppointmentsService.getAll.mockResolvedValue(makePaginatedAppointments())

    renderWithProviders(<AgendaDayGrid {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('agenda-slot-free')).toBeInTheDocument()
    })

    expect(screen.getByTestId('agenda-slot-free')).toHaveTextContent('09:00')
  })

  it('renders booked slot', async () => {
    mockAppointmentsService.getAvailability.mockResolvedValue(makeAvailabilityResponse([]))
    mockAppointmentsService.getAll.mockResolvedValue(
      makePaginatedAppointments([makeAppointmentDto()]),
    )

    renderWithProviders(<AgendaDayGrid {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('agenda-slot-booked')).toBeInTheDocument()
    })

    expect(screen.getByTestId('agenda-slot-booked')).toHaveTextContent('Patient One')
  })

  it('opens BookAppointmentDialog when clicking free slot as ADMIN', async () => {
    mockAppointmentsService.getAvailability.mockResolvedValue(
      makeAvailabilityResponse([{ startTime: '09:00', endTime: '09:30' }]),
    )
    mockAppointmentsService.getAll.mockResolvedValue(makePaginatedAppointments())

    renderWithProviders(<AgendaDayGrid {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('agenda-slot-free')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('agenda-slot-free'))
    expect(screen.getByTestId('book-appointment-dialog')).toBeInTheDocument()
  })

  it('free slot button is disabled for USER role', async () => {
    mockAppointmentsService.getAvailability.mockResolvedValue(
      makeAvailabilityResponse([{ startTime: '09:00', endTime: '09:30' }]),
    )
    mockAppointmentsService.getAll.mockResolvedValue(makePaginatedAppointments())

    renderWithProviders(<AgendaDayGrid {...defaultProps} role={UserRole.USER} />)

    await waitFor(() => {
      expect(screen.getByTestId('agenda-slot-free')).toBeInTheDocument()
    })

    expect(screen.getByTestId('agenda-slot-free')).toBeDisabled()
  })

  it('free slot in the past is disabled even for ADMIN', async () => {
    mockAppointmentsService.getAvailability.mockResolvedValue(
      makeAvailabilityResponse([{ startTime: '09:00', endTime: '09:30' }], PAST_DATE),
    )
    mockAppointmentsService.getAll.mockResolvedValue(makePaginatedAppointments())

    renderWithProviders(<AgendaDayGrid {...defaultProps} date={PAST_DATE} role={UserRole.ADMIN} />)

    await waitFor(() => {
      expect(screen.getByTestId('agenda-slot-free')).toBeInTheDocument()
    })

    expect(screen.getByTestId('agenda-slot-free')).toBeDisabled()
    expect(screen.getByTestId('agenda-slot-free')).toHaveTextContent('Passado')
  })

  it('renders BlockBanner for each exception returned', async () => {
    mockAppointmentsService.getAvailability.mockResolvedValue(makeAvailabilityResponse([]))
    mockAppointmentsService.getAll.mockResolvedValue(makePaginatedAppointments())
    mockScheduleExceptionsService.getAll.mockResolvedValue({
      data: [
        {
          id: 'exc-1',
          doctorId: 'doctor-uuid',
          date: FUTURE_DATE,
          startTime: '14:00',
          endTime: '18:00',
          reason: 'Congresso',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    })

    renderWithProviders(<AgendaDayGrid {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('block-banner')).toBeInTheDocument()
    })

    expect(screen.getByTestId('block-banner-window')).toHaveTextContent('14:00 – 18:00 · Bloqueado')
    expect(screen.getByTestId('block-banner-reason')).toHaveTextContent('Congresso')
  })

  it('does not render BlockBanner when no exceptions exist', async () => {
    mockAppointmentsService.getAvailability.mockResolvedValue(
      makeAvailabilityResponse([{ startTime: '09:00', endTime: '09:30' }]),
    )
    mockAppointmentsService.getAll.mockResolvedValue(makePaginatedAppointments())
    mockScheduleExceptionsService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<AgendaDayGrid {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('agenda-slot-free')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('block-banner')).not.toBeInTheDocument()
  })
})
