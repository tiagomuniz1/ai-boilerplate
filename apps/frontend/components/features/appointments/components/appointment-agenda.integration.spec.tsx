jest.mock('../services/appointments.service')
jest.mock('@/components/features/patients/services/patients.service')
jest.mock('@/components/features/professionals/services/professionals.service')
jest.mock('@/components/features/schedule-exceptions/services/schedule-exceptions.service')
jest.mock('@/stores/auth.store')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserRole } from '@app/shared'
import { useRouter, useSearchParams } from 'next/navigation'
import { appointmentsService } from '../services/appointments.service'
import { patientsService } from '@/components/features/patients/services/patients.service'
import { professionalsService } from '@/components/features/professionals/services/professionals.service'
import { scheduleExceptionsService } from '@/components/features/schedule-exceptions/services/schedule-exceptions.service'
import { useAuthStore } from '@/stores/auth.store'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { AppointmentAgenda } from './appointment-agenda'

const mockAppointmentsService = appointmentsService as jest.Mocked<typeof appointmentsService>
const mockPatientsService = patientsService as jest.Mocked<typeof patientsService>
const mockDoctorsService = professionalsService as jest.Mocked<typeof professionalsService>
const mockScheduleExceptionsService = scheduleExceptionsService as jest.Mocked<typeof scheduleExceptionsService>
const mockUseAuthStore = useAuthStore as unknown as jest.Mock
const mockUseSearchParams = useSearchParams as jest.Mock
const mockUseRouter = useRouter as jest.Mock

function mockAuth(role: UserRole, userId = 'user-uuid') {
  mockUseAuthStore.mockImplementation((selector: (s: { user: object }) => unknown) =>
    selector({ user: { id: userId, fullName: 'Test User', email: 'test@test.com', role, clinicId: 'clinic-uuid' } }),
  )
}

const makeDoctorsResponse = (doctors: { id: string; fullName: string }[] = []) => ({
  data: doctors.map((d) => ({
    id: d.id,
    user: { id: 'user-uuid', fullName: d.fullName, email: `${d.id}@test.com`, isActive: true },
    crmNumber: '123456',
    specialties: [],
    bio: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  total: doctors.length,
  page: 1,
  limit: 200,
})

const emptyAvailability = { doctorId: 'doctor-uuid', date: '2025-07-01', slots: [] }
const emptyAppointments = { data: [], total: 0, page: 1, limit: 100 }

describe('AppointmentAgenda (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPatientsService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 200 })
    mockAppointmentsService.getAvailability.mockResolvedValue(emptyAvailability)
    mockAppointmentsService.getAll.mockResolvedValue(emptyAppointments)
    mockScheduleExceptionsService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })
  })

  it('renders the agenda toolbar', () => {
    mockAuth(UserRole.ADMIN)
    mockDoctorsService.getAll.mockResolvedValue(makeDoctorsResponse([]))
    renderWithProviders(<AppointmentAgenda />)
    expect(screen.getByTestId('agenda-toolbar')).toBeInTheDocument()
  })

  it('ADMIN sees doctor selector in toolbar', () => {
    mockAuth(UserRole.ADMIN)
    mockDoctorsService.getAll.mockResolvedValue(makeDoctorsResponse([{ id: 'd1', fullName: 'Dr. A' }]))
    renderWithProviders(<AppointmentAgenda />)
    expect(screen.getByTestId('toolbar-doctor-selector')).toBeInTheDocument()
  })

  it('USER sees doctor selector in toolbar', () => {
    mockAuth(UserRole.USER)
    mockDoctorsService.getAll.mockResolvedValue(makeDoctorsResponse([{ id: 'd1', fullName: 'Dr. A' }]))
    renderWithProviders(<AppointmentAgenda />)
    expect(screen.getByTestId('toolbar-doctor-selector')).toBeInTheDocument()
  })

  it('DOCTOR does not see doctor selector in toolbar', () => {
    mockAuth(UserRole.PROFESSIONAL)
    mockDoctorsService.getAll.mockResolvedValue(
      makeDoctorsResponse([{ id: 'my-doctor', fullName: 'Dr. Me' }]),
    )
    renderWithProviders(<AppointmentAgenda />)
    expect(screen.queryByTestId('toolbar-doctor-selector')).not.toBeInTheDocument()
  })

  it('ADMIN sees empty state until doctor is selected', () => {
    mockAuth(UserRole.ADMIN)
    mockDoctorsService.getAll.mockResolvedValue(makeDoctorsResponse([{ id: 'd1', fullName: 'Dr. A' }]))
    renderWithProviders(<AppointmentAgenda />)
    expect(screen.getByTestId('agenda-empty-doctor')).toBeInTheDocument()
  })

  it('defaults to week view on load', () => {
    mockAuth(UserRole.PROFESSIONAL)
    mockDoctorsService.getAll.mockResolvedValue(
      makeDoctorsResponse([{ id: 'my-doctor', fullName: 'Dr. Me' }]),
    )

    renderWithProviders(<AppointmentAgenda />)

    expect(screen.getByTestId('agenda-week-grid')).toBeInTheDocument()
  })

  it('switches to day view when clicking day button', async () => {
    mockAuth(UserRole.PROFESSIONAL)
    mockDoctorsService.getAll.mockResolvedValue(
      makeDoctorsResponse([{ id: 'my-doctor', fullName: 'Dr. Me' }]),
    )

    renderWithProviders(<AppointmentAgenda />)

    await userEvent.click(screen.getByTestId('toolbar-view-day'))

    await waitFor(() => {
      expect(screen.queryByTestId('agenda-week-grid')).not.toBeInTheDocument()
    })
  })

  it('navigates forward when clicking next', async () => {
    mockAuth(UserRole.PROFESSIONAL)
    mockDoctorsService.getAll.mockResolvedValue(
      makeDoctorsResponse([{ id: 'my-doctor', fullName: 'Dr. Me' }]),
    )

    renderWithProviders(<AppointmentAgenda />)

    const initialLabel = screen.getByTestId('toolbar-date-label').textContent

    await userEvent.click(screen.getByTestId('toolbar-next'))

    const newLabel = screen.getByTestId('toolbar-date-label').textContent
    expect(newLabel).not.toBe(initialLabel)
  })

  it('DOCTOR sees "Bloquear horário" button', () => {
    mockAuth(UserRole.PROFESSIONAL)
    mockDoctorsService.getAll.mockResolvedValue(
      makeDoctorsResponse([{ id: 'my-doctor', fullName: 'Dr. Me' }]),
    )
    renderWithProviders(<AppointmentAgenda />)
    expect(screen.getByTestId('toolbar-block-time')).toBeInTheDocument()
  })

  it('ADMIN sees "Bloquear horário" button', () => {
    mockAuth(UserRole.ADMIN)
    mockDoctorsService.getAll.mockResolvedValue(makeDoctorsResponse([{ id: 'd1', fullName: 'Dr. A' }]))
    renderWithProviders(<AppointmentAgenda />)
    expect(screen.getByTestId('toolbar-block-time')).toBeInTheDocument()
  })

  it('USER does not see "Bloquear horário" button', () => {
    mockAuth(UserRole.USER)
    mockDoctorsService.getAll.mockResolvedValue(makeDoctorsResponse([{ id: 'd1', fullName: 'Dr. A' }]))
    renderWithProviders(<AppointmentAgenda />)
    expect(screen.queryByTestId('toolbar-block-time')).not.toBeInTheDocument()
  })

  it('ADMIN "Bloquear horário" button is disabled when no doctor selected', () => {
    mockAuth(UserRole.ADMIN)
    mockDoctorsService.getAll.mockResolvedValue(makeDoctorsResponse([{ id: 'd1', fullName: 'Dr. A' }]))
    renderWithProviders(<AppointmentAgenda />)
    expect(screen.getByTestId('toolbar-block-time')).toBeDisabled()
  })

  it('DOCTOR "Bloquear horário" button opens BlockTimeDialog', async () => {
    mockAuth(UserRole.PROFESSIONAL)
    mockDoctorsService.getAll.mockResolvedValue(
      makeDoctorsResponse([{ id: 'my-doctor', fullName: 'Dr. Me' }]),
    )
    renderWithProviders(<AppointmentAgenda />)

    await userEvent.click(screen.getByTestId('toolbar-block-time'))

    expect(screen.getByTestId('block-time-dialog')).toBeInTheDocument()
  })

  it('DOCTOR "Bloquear horário" closes BlockTimeDialog on close', async () => {
    mockAuth(UserRole.PROFESSIONAL)
    mockDoctorsService.getAll.mockResolvedValue(
      makeDoctorsResponse([{ id: 'my-doctor', fullName: 'Dr. Me' }]),
    )

    renderWithProviders(<AppointmentAgenda />)

    await userEvent.click(screen.getByTestId('toolbar-block-time'))
    expect(screen.getByTestId('block-time-dialog')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    await waitFor(() => {
      expect(screen.queryByTestId('block-time-dialog')).not.toBeInTheDocument()
    })
  })

  it('defaults role to USER when user is null', () => {
    mockUseAuthStore.mockImplementation((selector: (s: { user: null }) => unknown) =>
      selector({ user: null }),
    )
    mockDoctorsService.getAll.mockResolvedValue(makeDoctorsResponse([]))
    renderWithProviders(<AppointmentAgenda />)
    // USER role: doctor selector shown, no block time button
    expect(screen.getByTestId('toolbar-doctor-selector')).toBeInTheDocument()
    expect(screen.queryByTestId('toolbar-block-time')).not.toBeInTheDocument()
  })

  it('restores doctor from URL search param', () => {
    mockAuth(UserRole.ADMIN)
    mockUseSearchParams.mockReturnValue(new URLSearchParams('doctor=doc-from-url&date=2025-06-20&view=week'))
    mockDoctorsService.getAll.mockResolvedValue(makeDoctorsResponse([{ id: 'doc-from-url', fullName: 'Dr. URL' }]))
    renderWithProviders(<AppointmentAgenda />)
    expect(screen.queryByTestId('agenda-empty-doctor')).not.toBeInTheDocument()
  })

  it('restores day view from URL search param', () => {
    mockAuth(UserRole.PROFESSIONAL)
    mockUseSearchParams.mockReturnValue(new URLSearchParams('view=day'))
    mockDoctorsService.getAll.mockResolvedValue(
      makeDoctorsResponse([{ id: 'my-doctor', fullName: 'Dr. Me' }]),
    )
    renderWithProviders(<AppointmentAgenda />)
    expect(screen.queryByTestId('agenda-week-grid')).not.toBeInTheDocument()
  })

  it('falls back to today when the date URL param is invalid', () => {
    mockAuth(UserRole.PROFESSIONAL)
    mockUseSearchParams.mockReturnValue(new URLSearchParams('date=not-a-date'))
    mockDoctorsService.getAll.mockResolvedValue(
      makeDoctorsResponse([{ id: 'my-doctor', fullName: 'Dr. Me' }]),
    )
    renderWithProviders(<AppointmentAgenda />)
    expect(screen.getByTestId('agenda-week-grid')).toBeInTheDocument()
  })

  it('clears the doctor param from the URL when selection is reset to empty', async () => {
    mockAuth(UserRole.ADMIN)
    const replaceMock = jest.fn()
    mockUseRouter.mockReturnValue({ push: jest.fn(), replace: replaceMock })
    mockUseSearchParams.mockReturnValue(new URLSearchParams('doctor=d1'))
    mockDoctorsService.getAll.mockResolvedValue(makeDoctorsResponse([{ id: 'd1', fullName: 'Dr. A' }]))
    renderWithProviders(<AppointmentAgenda />)

    await userEvent.selectOptions(screen.getByTestId('toolbar-doctor-select'), '')

    expect(replaceMock).toHaveBeenCalled()
    const [url] = replaceMock.mock.calls[replaceMock.mock.calls.length - 1]
    expect(url).not.toContain('doctor=')
  })

  it('syncs view to URL when view changes', async () => {
    mockAuth(UserRole.PROFESSIONAL)
    const replaceMock = jest.fn()
    mockUseRouter.mockReturnValue({ push: jest.fn(), replace: replaceMock })
    mockDoctorsService.getAll.mockResolvedValue(
      makeDoctorsResponse([{ id: 'my-doctor', fullName: 'Dr. Me' }]),
    )
    renderWithProviders(<AppointmentAgenda />)
    await userEvent.click(screen.getByTestId('toolbar-view-day'))
    expect(replaceMock).toHaveBeenCalledWith(
      expect.stringContaining('view=day'),
      expect.objectContaining({ scroll: false }),
    )
  })
})
