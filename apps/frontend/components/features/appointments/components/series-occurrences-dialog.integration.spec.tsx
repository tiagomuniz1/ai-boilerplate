jest.mock('../services/appointments.service')
jest.mock('@/lib/slug-context', () => ({
  useSlug: jest.fn(() => 'clinic-slug'),
  useBasePath: () => '/clinic-slug',
}))
jest.mock('next/navigation', () => ({ useRouter: jest.fn(() => ({ push: jest.fn() })) }))

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { AppointmentStatus, DayOfWeek, RecurrenceInterval } from '@app/shared'
import { appointmentsService } from '../services/appointments.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { SeriesOccurrencesDialog } from './series-occurrences-dialog'

const mockAppointmentsService = appointmentsService as jest.Mocked<typeof appointmentsService>
const mockUseRouter = useRouter as jest.Mock

const makeOccurrenceDto = (id: string, date: string, sequence: number, overrides: object = {}) => ({
  id,
  professionalId: 'doctor-uuid',
  professionalName: 'Dr. Test',
  patientId: 'patient-uuid',
  patientName: 'Patient One',
  specialtyId: null,
  specialtyName: null,
  scheduleId: 'schedule-uuid',
  date,
  startTime: '09:00',
  endTime: '09:30',
  status: AppointmentStatus.SCHEDULED,
  insuranceType: null,
  reason: null,
  cancellationReason: null,
  seriesId: 'series-uuid',
  seriesSequence: sequence,
  seriesTotalOccurrences: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeSeriesDto = (overrides: object = {}) => ({
  id: 'series-uuid',
  professionalId: 'doctor-uuid',
  professionalName: 'Dr. Test',
  patientId: 'patient-uuid',
  patientName: 'Patient One',
  specialtyId: null,
  specialtyName: null,
  recurrenceInterval: RecurrenceInterval.EVERY_TWO_WEEKS,
  dayOfWeek: DayOfWeek.TUESDAY,
  startTime: '09:00',
  // A Tuesday.
  anchorDate: '2099-06-16',
  requestedOccurrenceCount: 3,
  requestedUntilDate: null,
  createdOccurrenceCount: 3,
  createdAt: new Date(),
  occurrences: [
    makeOccurrenceDto('apt-1', '2099-06-16', 1),
    makeOccurrenceDto('apt-2', '2099-06-30', 2),
    makeOccurrenceDto('apt-3', '2099-07-14', 3, { status: AppointmentStatus.CANCELLED }),
  ],
  ...overrides,
})

const defaultProps = {
  seriesId: 'series-uuid',
  isOpen: true,
  onClose: jest.fn(),
}

describe('SeriesOccurrencesDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ push: jest.fn() })
  })

  it('renders the loading skeleton while fetching', () => {
    mockAppointmentsService.getSeries.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<SeriesOccurrencesDialog {...defaultProps} />)

    expect(screen.getByTestId('series-dialog-loading')).toBeInTheDocument()
  })

  it('renders the error state when the request fails', async () => {
    mockAppointmentsService.getSeries.mockRejectedValue(new Error('Network error'))

    renderWithProviders(<SeriesOccurrencesDialog {...defaultProps} />)

    await waitFor(() => expect(screen.getByTestId('series-dialog-error')).toBeInTheDocument())
  })

  it('summarises the recurrence rule and lists every occurrence with its status', async () => {
    mockAppointmentsService.getSeries.mockResolvedValue(makeSeriesDto() as never)

    renderWithProviders(<SeriesOccurrencesDialog {...defaultProps} />)

    await waitFor(() => expect(screen.getByTestId('series-dialog-list')).toBeInTheDocument())

    const summary = screen.getByTestId('series-dialog-summary')
    expect(summary).toHaveTextContent('Toda terça-feira às 09:00')
    expect(summary).toHaveTextContent('A cada 2 semanas')
    expect(summary).toHaveTextContent('3 consultas')

    expect(screen.getByTestId('series-dialog-item-2099-06-16')).toHaveTextContent('16/06/2099')
    expect(screen.getByTestId('series-dialog-status-2099-06-16')).toHaveTextContent('Agendada')
    expect(screen.getByTestId('series-dialog-status-2099-07-14')).toHaveTextContent('Cancelada')
  })

  it('marks the occurrence currently being viewed', async () => {
    mockAppointmentsService.getSeries.mockResolvedValue(makeSeriesDto() as never)

    renderWithProviders(<SeriesOccurrencesDialog {...defaultProps} currentAppointmentId="apt-2" />)

    await waitFor(() => expect(screen.getByTestId('series-dialog-list')).toBeInTheDocument())

    expect(screen.getByTestId('series-dialog-item-2099-06-30')).toHaveAttribute('aria-current', 'true')
    expect(screen.getByTestId('series-dialog-item-2099-06-16')).not.toHaveAttribute('aria-current')
  })

  it('navigates to an occurrence and closes the dialog', async () => {
    const push = jest.fn()
    mockUseRouter.mockReturnValue({ push })
    mockAppointmentsService.getSeries.mockResolvedValue(makeSeriesDto() as never)

    renderWithProviders(<SeriesOccurrencesDialog {...defaultProps} />)

    await waitFor(() => expect(screen.getByTestId('series-dialog-list')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('series-dialog-item-2099-06-30'))

    expect(push).toHaveBeenCalledWith('/clinic-slug/appointments/apt-2')
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('does not fetch while the dialog is closed', () => {
    renderWithProviders(<SeriesOccurrencesDialog {...defaultProps} isOpen={false} />)

    expect(mockAppointmentsService.getSeries).not.toHaveBeenCalled()
  })
})
