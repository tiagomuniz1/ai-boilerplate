jest.mock('../services/appointments.service')
jest.mock('@/components/features/patients/services/patients.service')
jest.mock('@/components/features/schedule-exceptions/services/schedule-exceptions.service')
jest.mock('next/navigation', () => ({ useRouter: jest.fn(() => ({ push: jest.fn() })) }))

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserRole } from '@app/shared'
import { appointmentsService } from '../services/appointments.service'
import { patientsService } from '@/components/features/patients/services/patients.service'
import { scheduleExceptionsService } from '@/components/features/schedule-exceptions/services/schedule-exceptions.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { AgendaWeekGrid } from './agenda-week-grid'

const mockAppointmentsService = appointmentsService as jest.Mocked<typeof appointmentsService>
const mockPatientsService = patientsService as jest.Mocked<typeof patientsService>
const mockScheduleExceptionsService = scheduleExceptionsService as jest.Mocked<typeof scheduleExceptionsService>

const emptyAvailability = { professionalId: 'doctor-uuid', date: '2025-06-30', slots: [] }
const emptyAppointments = { data: [], total: 0, page: 1, limit: 100 }
const emptyExceptions = { data: [], total: 0, page: 1, limit: 20 }

const defaultProps = {
  professionalId: 'doctor-uuid',
  startDate: '2025-06-29',
  role: UserRole.ADMIN,
}

describe('AgendaWeekGrid (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPatientsService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 200 })
    mockAppointmentsService.getAvailability.mockResolvedValue(emptyAvailability)
    mockAppointmentsService.getAll.mockResolvedValue(emptyAppointments)
    mockScheduleExceptionsService.getAll.mockResolvedValue(emptyExceptions)
  })

  it('renders empty state when professionalId is null', () => {
    renderWithProviders(<AgendaWeekGrid {...defaultProps} professionalId={null} />)
    expect(screen.getByTestId('agenda-empty-professional')).toBeInTheDocument()
  })

  it('renders week grid with 7 columns when professionalId is provided', async () => {
    renderWithProviders(<AgendaWeekGrid {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('agenda-week-grid')).toBeInTheDocument()
    })
  })

  it('renders day labels for all 7 days', async () => {
    renderWithProviders(<AgendaWeekGrid {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('agenda-week-grid')).toBeInTheDocument()
    })

    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    dayLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })

  it('calls getAvailability for each day of the week', async () => {
    renderWithProviders(<AgendaWeekGrid {...defaultProps} />)

    await waitFor(() => {
      expect(mockAppointmentsService.getAvailability).toHaveBeenCalledTimes(7)
    })
  })

  it('renders BlockBanner in the correct day column', async () => {
    mockScheduleExceptionsService.getAll.mockImplementation((params) => {
      if (params?.from === '2025-06-30') {
        return Promise.resolve({
          data: [
            {
              id: 'exc-1',
              professionalId: 'doctor-uuid',
              date: '2025-06-30',
              startTime: '08:00',
              endTime: '12:00',
              reason: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        })
      }
      return Promise.resolve(emptyExceptions)
    })

    renderWithProviders(<AgendaWeekGrid {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('block-banner')).toBeInTheDocument()
    })

    expect(screen.getByTestId('block-banner-window')).toHaveTextContent('08:00 – 12:00 · Bloqueado')
  })

  it('does not render BlockBanner when no exceptions exist', async () => {
    renderWithProviders(<AgendaWeekGrid {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('agenda-week-grid')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('block-banner')).not.toBeInTheDocument()
  })

  it('renders loading skeleton in a day column while fetching', async () => {
    mockAppointmentsService.getAvailability.mockReturnValue(new Promise(() => {}))
    mockAppointmentsService.getAll.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<AgendaWeekGrid {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('agenda-week-grid')).toBeInTheDocument()
    })

    expect(screen.getAllByTestId('agenda-skeleton').length).toBeGreaterThan(0)
  })

  it('renders error state in a day column when fetch fails', async () => {
    mockAppointmentsService.getAvailability.mockRejectedValue({ status: 500 })
    mockAppointmentsService.getAll.mockRejectedValue({ status: 500 })

    renderWithProviders(<AgendaWeekGrid {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getAllByText('Erro').length).toBeGreaterThan(0)
    })
  })

  it('clicking a free slot opens BookAppointmentDialog', async () => {
    const futureStart = '2099-06-29'
    const SLOT_DATE = '2099-06-30'
    mockAppointmentsService.getAvailability.mockImplementation((params) => {
      if (params?.date === SLOT_DATE) {
        return Promise.resolve({
          professionalId: 'doctor-uuid',
          date: SLOT_DATE,
          slots: [{ startTime: '09:00', endTime: '09:30' }],
        })
      }
      return Promise.resolve(emptyAvailability)
    })
    mockAppointmentsService.getAll.mockResolvedValue(emptyAppointments)

    renderWithProviders(<AgendaWeekGrid {...defaultProps} startDate={futureStart} role={UserRole.ADMIN} />)

    const freeSlot = await screen.findAllByTestId('agenda-slot-free', {}, { timeout: 3000 })
    await userEvent.click(freeSlot[0])

    expect(screen.getByTestId('book-appointment-dialog')).toBeInTheDocument()
  })

  it('closing BookAppointmentDialog hides it', async () => {
    const futureStart = '2099-06-29'
    const SLOT_DATE = '2099-06-30'
    mockAppointmentsService.getAvailability.mockImplementation((params) => {
      if (params?.date === SLOT_DATE) {
        return Promise.resolve({
          professionalId: 'doctor-uuid',
          date: SLOT_DATE,
          slots: [{ startTime: '09:00', endTime: '09:30' }],
        })
      }
      return Promise.resolve(emptyAvailability)
    })
    mockAppointmentsService.getAll.mockResolvedValue(emptyAppointments)

    renderWithProviders(<AgendaWeekGrid {...defaultProps} startDate={futureStart} role={UserRole.ADMIN} />)

    const freeSlot = await screen.findAllByTestId('agenda-slot-free', {}, { timeout: 3000 })
    await userEvent.click(freeSlot[0])

    expect(screen.getByTestId('book-appointment-dialog')).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('book-dialog-cancel'))

    await waitFor(() => {
      expect(screen.queryByTestId('book-appointment-dialog')).not.toBeInTheDocument()
    })
  })

  it('clicking a booked slot opens AppointmentDetailsDialog', async () => {
    const SLOT_DATE = '2025-06-30'
    mockAppointmentsService.getAvailability.mockResolvedValue(emptyAvailability)
    mockAppointmentsService.getAll.mockImplementation((params) => {
      if (params?.from === SLOT_DATE) {
        return Promise.resolve({
          data: [{
            id: 'appt-1',
            professionalId: 'doctor-uuid',
            professionalName: 'Dr. Test',
            patientId: 'patient-uuid',
            patientName: 'Patient One',
            specialtyId: null,
            specialtyName: null,
            scheduleId: 'sched-uuid',
            date: SLOT_DATE,
            startTime: '09:00',
            endTime: '09:30',
            status: 'scheduled',
            reason: null,
            cancellationReason: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }],
          total: 1,
          page: 1,
          limit: 100,
        })
      }
      return Promise.resolve(emptyAppointments)
    })
    mockAppointmentsService.getById.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<AgendaWeekGrid {...defaultProps} />)

    const bookedSlot = await screen.findAllByTestId('agenda-slot-booked', {}, { timeout: 3000 })
    await userEvent.click(bookedSlot[0])

    expect(screen.getByTestId('appointment-details-dialog')).toBeInTheDocument()
  })

  it('closing AppointmentDetailsDialog hides it', async () => {
    const SLOT_DATE = '2025-06-30'
    mockAppointmentsService.getAvailability.mockResolvedValue(emptyAvailability)
    mockAppointmentsService.getAll.mockImplementation((params) => {
      if (params?.from === SLOT_DATE) {
        return Promise.resolve({
          data: [{
            id: 'appt-1',
            professionalId: 'doctor-uuid',
            professionalName: 'Dr. Test',
            patientId: 'patient-uuid',
            patientName: 'Patient One',
            specialtyId: null,
            specialtyName: null,
            scheduleId: 'sched-uuid',
            date: SLOT_DATE,
            startTime: '09:00',
            endTime: '09:30',
            status: 'scheduled',
            reason: null,
            cancellationReason: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }],
          total: 1,
          page: 1,
          limit: 100,
        })
      }
      return Promise.resolve(emptyAppointments)
    })
    mockAppointmentsService.getById.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<AgendaWeekGrid {...defaultProps} />)

    const bookedSlot = await screen.findAllByTestId('agenda-slot-booked', {}, { timeout: 3000 })
    await userEvent.click(bookedSlot[0])

    expect(screen.getByTestId('appointment-details-dialog')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /fechar/i }))

    await waitFor(() => {
      expect(screen.queryByTestId('appointment-details-dialog')).not.toBeInTheDocument()
    })
  })

  it('renders booked slot when appointment is returned', async () => {
    const SLOT_DATE = '2025-06-30'

    mockAppointmentsService.getAvailability.mockResolvedValue(emptyAvailability)
    mockAppointmentsService.getAll.mockImplementation((params) => {
      if (params?.from === SLOT_DATE) {
        return Promise.resolve({
          data: [
            {
              id: 'appt-1',
              professionalId: 'doctor-uuid',
              professionalName: 'Dr. Test',
              patientId: 'patient-uuid',
              patientName: 'Patient One',
              scheduleId: 'sched-uuid',
              date: SLOT_DATE,
              startTime: '09:00',
              endTime: '09:30',
              status: 'scheduled',
              reason: null,
              cancellationReason: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          total: 1,
          page: 1,
          limit: 100,
        })
      }
      return Promise.resolve(emptyAppointments)
    })

    renderWithProviders(<AgendaWeekGrid {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getAllByTestId('agenda-slot-booked').length).toBeGreaterThan(0)
    })
  })
})
