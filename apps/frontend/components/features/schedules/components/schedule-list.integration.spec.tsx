jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/stores/auth.store')
jest.mock('../services/schedules.service')
jest.mock('../use-cases/delete-schedule.use-case')
jest.mock('@/components/features/doctors/services/doctors.service')

import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { UserRole, DayOfWeek } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { schedulesService } from '../services/schedules.service'
import { deleteScheduleUseCase } from '../use-cases/delete-schedule.use-case'
import { doctorsService } from '@/components/features/doctors/services/doctors.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ScheduleList } from './schedule-list'

const mockPush = jest.fn()

function mockAuthStoreAs(role: UserRole) {
  ;(useAuthStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: { user: { id: string; fullName: string; email: string; role: UserRole } }) => unknown) =>
      selector({ user: { id: 'user-uuid', fullName: 'Test User', email: 'test@example.com', role } }),
  )
}

const makeScheduleDto = (overrides = {}) => ({
  id: 'uuid-1',
  doctorId: 'doc-uuid-1',
  doctorName: 'Dr. João Silva',
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
  validFrom: null,
  validUntil: null,
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-02T10:00:00.000Z',
  ...overrides,
})

const makePaginatedResponse = (items = [makeScheduleDto()]) => ({
  data: items,
  total: items.length,
  page: 1,
  limit: 20,
})

const makeDoctorDto = (overrides = {}) => ({
  id: 'doc-uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@example.com', isActive: true },
  crmNumber: '12345/SP',
  specialties: [],
  bio: null,
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z',
  ...overrides,
})

describe('ScheduleList (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDoctorDto()], total: 1, page: 1, limit: 100 })
  })

  describe('as DOCTOR', () => {
    beforeEach(() => mockAuthStoreAs(UserRole.DOCTOR))

    it('renders skeleton while loading', () => {
      ;(schedulesService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

      renderWithProviders(<ScheduleList />)

      expect(screen.getByTestId('schedule-list-skeleton')).toBeInTheDocument()
    })

    it('renders table with schedules on success', async () => {
      ;(schedulesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())

      renderWithProviders(<ScheduleList />)

      await waitFor(() => {
        expect(screen.getByTestId('schedule-list-table')).toBeInTheDocument()
      })

      expect(screen.getByTestId('schedule-day-uuid-1')).toHaveTextContent('Segunda-feira')
      expect(screen.getByTestId('schedule-time-uuid-1')).toHaveTextContent('08:00 – 12:00')
      expect(screen.getByTestId('schedule-slot-uuid-1')).toHaveTextContent('30 min')
    })

    it('hides doctor filter and doctor column', async () => {
      ;(schedulesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())

      renderWithProviders(<ScheduleList />)

      await waitFor(() => expect(screen.getByTestId('schedule-list-table')).toBeInTheDocument())

      expect(screen.queryByTestId('schedule-filter-doctor')).not.toBeInTheDocument()
      expect(screen.queryByTestId('schedule-doctor-uuid-1')).not.toBeInTheDocument()
    })

    it('renders empty state when no schedules', async () => {
      ;(schedulesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse([]))

      renderWithProviders(<ScheduleList />)

      await waitFor(() => expect(screen.getByTestId('schedule-list-empty')).toBeInTheDocument())
    })

    it('renders error state on failure', async () => {
      ;(schedulesService.getAll as jest.Mock).mockRejectedValue({ status: 500 })

      renderWithProviders(<ScheduleList />)

      await waitFor(() => expect(screen.getByTestId('schedule-list-error')).toBeInTheDocument())
    })

    it('opens delete dialog when delete button is clicked', async () => {
      ;(schedulesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())

      renderWithProviders(<ScheduleList />)

      await waitFor(() => expect(screen.getByTestId('schedule-list-table')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('schedule-delete-button-uuid-1'))

      expect(screen.getByTestId('delete-schedule-dialog-confirm')).toBeInTheDocument()
    })

    it('calls deleteScheduleUseCase and shows success message after confirm', async () => {
      ;(schedulesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())
      ;(deleteScheduleUseCase as jest.Mock).mockResolvedValue(undefined)

      renderWithProviders(<ScheduleList />)

      await waitFor(() => expect(screen.getByTestId('schedule-list-table')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('schedule-delete-button-uuid-1'))
      await userEvent.click(screen.getByTestId('delete-schedule-dialog-confirm'))

      await waitFor(() => expect(screen.getByTestId('schedule-list-success')).toBeInTheDocument())
    })

    it('closes dialog on delete error without showing success message', async () => {
      ;(schedulesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())
      ;(deleteScheduleUseCase as jest.Mock).mockRejectedValue({ status: 500 })

      renderWithProviders(<ScheduleList />)

      await waitFor(() => expect(screen.getByTestId('schedule-list-table')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('schedule-delete-button-uuid-1'))
      await userEvent.click(screen.getByTestId('delete-schedule-dialog-confirm'))

      await waitFor(() => {
        expect(screen.queryByTestId('delete-schedule-dialog-confirm')).not.toBeInTheDocument()
      })

      expect(screen.queryByTestId('schedule-list-success')).not.toBeInTheDocument()
    })

    it('shows "∞" when validFrom is set but validUntil is null', async () => {
      ;(schedulesService.getAll as jest.Mock).mockResolvedValue(
        makePaginatedResponse([makeScheduleDto({ validFrom: '2025-01-01', validUntil: null })]),
      )

      renderWithProviders(<ScheduleList />)

      await waitFor(() => expect(screen.getByTestId('schedule-validity-uuid-1')).toBeInTheDocument())

      expect(screen.getByTestId('schedule-validity-uuid-1')).toHaveTextContent('2025-01-01 → ∞')
    })

    it('shows "∞" for validFrom when validFrom is null but validUntil is set', async () => {
      ;(schedulesService.getAll as jest.Mock).mockResolvedValue(
        makePaginatedResponse([makeScheduleDto({ validFrom: null, validUntil: '2025-12-31' })]),
      )

      renderWithProviders(<ScheduleList />)

      await waitFor(() => expect(screen.getByTestId('schedule-validity-uuid-1')).toBeInTheDocument())

      expect(screen.getByTestId('schedule-validity-uuid-1')).toHaveTextContent('∞ → 2025-12-31')
    })

    it('filters by dayOfWeek when day filter is changed', async () => {
      ;(schedulesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())

      renderWithProviders(<ScheduleList />)

      await userEvent.selectOptions(screen.getByTestId('schedule-filter-day'), 'MONDAY')

      await waitFor(() => {
        expect(schedulesService.getAll).toHaveBeenCalledWith(expect.objectContaining({ dayOfWeek: 'MONDAY' }))
      })
    })

    it('filters by activeOn when date filter is changed', async () => {
      ;(schedulesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())

      renderWithProviders(<ScheduleList />)

      fireEvent.change(screen.getByTestId('schedule-filter-active-on'), { target: { value: '2025-06-01' } })

      await waitFor(() => {
        expect(schedulesService.getAll).toHaveBeenCalledWith(expect.objectContaining({ activeOn: '2025-06-01' }))
      })
    })

    it('closes delete dialog when cancel is clicked', async () => {
      ;(schedulesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())

      renderWithProviders(<ScheduleList />)

      await waitFor(() => expect(screen.getByTestId('schedule-list-table')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('schedule-delete-button-uuid-1'))
      expect(screen.getByTestId('delete-schedule-dialog-cancel')).toBeInTheDocument()

      await userEvent.click(screen.getByTestId('delete-schedule-dialog-cancel'))

      await waitFor(() => {
        expect(screen.queryByTestId('delete-schedule-dialog-cancel')).not.toBeInTheDocument()
      })
    })
  })

  describe('as ADMIN', () => {
    beforeEach(() => mockAuthStoreAs(UserRole.ADMIN))

    it('renders doctor filter', async () => {
      ;(schedulesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())

      renderWithProviders(<ScheduleList />)

      expect(screen.getByTestId('schedule-filter-doctor')).toBeInTheDocument()
    })

    it('renders doctor column in table', async () => {
      ;(schedulesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())

      renderWithProviders(<ScheduleList />)

      await waitFor(() => expect(screen.getByTestId('schedule-list-table')).toBeInTheDocument())

      expect(screen.getByTestId('schedule-doctor-uuid-1')).toBeInTheDocument()
    })

    it('updates doctorId filter when doctor select is changed', async () => {
      ;(schedulesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())

      renderWithProviders(<ScheduleList />)

      await waitFor(() => {
        const select = screen.getByTestId('schedule-filter-doctor-select') as HTMLSelectElement
        expect(select.options.length).toBeGreaterThan(1)
      })

      const select = screen.getByTestId('schedule-filter-doctor-select') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'doc-uuid-1' } })

      expect(select.value).toBe('doc-uuid-1')
    })

    it('shows plural count when more than one schedule is found', async () => {
      ;(schedulesService.getAll as jest.Mock).mockResolvedValue(
        makePaginatedResponse([makeScheduleDto(), makeScheduleDto({ id: 'uuid-2', doctorId: 'doc-uuid-1' })]),
      )

      renderWithProviders(<ScheduleList />)

      await waitFor(() => expect(screen.getByTestId('schedule-list-table')).toBeInTheDocument())

      expect(screen.getByText('2 agendas encontradas')).toBeInTheDocument()
    })

    it('shows singular count when exactly 1 schedule is found', async () => {
      ;(schedulesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse([makeScheduleDto()]))

      renderWithProviders(<ScheduleList />)

      await waitFor(() => expect(screen.getByTestId('schedule-list-table')).toBeInTheDocument())

      expect(screen.getByText('1 agenda encontrada')).toBeInTheDocument()
    })

    it('renders doctorName from the schedule DTO', async () => {
      ;(schedulesService.getAll as jest.Mock).mockResolvedValue(
        makePaginatedResponse([makeScheduleDto({ doctorName: 'Dr. Maria Santos' })]),
      )

      renderWithProviders(<ScheduleList />)

      await waitFor(() => expect(screen.getByTestId('schedule-doctor-uuid-1')).toBeInTheDocument())

      expect(screen.getByTestId('schedule-doctor-uuid-1')).toHaveTextContent('Dr. Maria Santos')
    })
  })
})
