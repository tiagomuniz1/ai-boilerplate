jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/doctors.service')
jest.mock('../use-cases/delete-doctor.use-case')

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { UserRole } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { doctorsService } from '../services/doctors.service'
import { deleteDoctorUseCase } from '../use-cases/delete-doctor.use-case'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { DoctorList } from './doctor-list'

const makeUser = (role: UserRole) => ({
  id: 'user-uuid',
  fullName: 'Test User',
  email: 'test@example.com',
  role,
  clinicId: 'clinic-uuid',
})

const mockPush = jest.fn()

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@example.com' },
  crmNumber: '12345/SP',
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia' }],
  bio: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-16T10:00:00.000Z',
  ...overrides,
})

describe('DoctorList (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
  })

  it('renders skeleton while loading', () => {
    ;(doctorsService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<DoctorList />)

    expect(screen.getByTestId('doctor-list-skeleton')).toBeInTheDocument()
  })

  it('renders table with doctors on success', async () => {
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    await waitFor(() => {
      expect(screen.getByTestId('doctor-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('doctor-name-uuid-1')).toHaveTextContent('Dr. João Silva')
    expect(screen.getByTestId('doctor-email-uuid-1')).toHaveTextContent('joao@example.com')
    expect(screen.getByTestId('doctor-crm-uuid-1')).toHaveTextContent('12345/SP')
    expect(screen.getByTestId('doctor-specialty-badge-spec-uuid-1')).toHaveTextContent('Cardiologia')
  })

  it('renders 1 badge when doctor has 1 specialty', async () => {
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    await waitFor(() => {
      expect(screen.getByTestId('doctor-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('doctor-specialty-badge-spec-uuid-1')).toBeInTheDocument()
  })

  it('renders 2 badges when doctor has 2 specialties', async () => {
    const dto = makeDto({
      specialties: [
        { id: 'spec-uuid-1', name: 'Cardiologia' },
        { id: 'spec-uuid-2', name: 'Neurologia' },
      ],
    })
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    await waitFor(() => {
      expect(screen.getByTestId('doctor-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('doctor-specialty-badge-spec-uuid-1')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-specialty-badge-spec-uuid-2')).toBeInTheDocument()
    expect(screen.queryByText(/\+\d+ mais/)).not.toBeInTheDocument()
  })

  it('renders 2 badges + overflow indicator when doctor has 4 specialties', async () => {
    const dto = makeDto({
      specialties: [
        { id: 'spec-uuid-1', name: 'Cardiologia' },
        { id: 'spec-uuid-2', name: 'Neurologia' },
        { id: 'spec-uuid-3', name: 'Ortopedia' },
        { id: 'spec-uuid-4', name: 'Pediatria' },
      ],
    })
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    await waitFor(() => {
      expect(screen.getByTestId('doctor-list-table')).toBeInTheDocument()
    })

    const table = screen.getByTestId('doctor-list-table')
    expect(within(table).getByTestId('doctor-specialty-badge-spec-uuid-1')).toBeInTheDocument()
    expect(within(table).getByTestId('doctor-specialty-badge-spec-uuid-2')).toBeInTheDocument()
    expect(within(table).queryByTestId('doctor-specialty-badge-spec-uuid-3')).not.toBeInTheDocument()
    expect(within(table).queryByTestId('doctor-specialty-badge-spec-uuid-4')).not.toBeInTheDocument()
    expect(within(table).getByText('+2 mais')).toBeInTheDocument()
  })

  it('renders empty specialty cell when doctor has no specialties', async () => {
    const dto = makeDto({ specialties: [] })
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    await waitFor(() => {
      expect(screen.getByTestId('doctor-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('doctor-specialty-uuid-1')).toBeInTheDocument()
    expect(screen.queryByTestId(/doctor-specialty-badge-/)).not.toBeInTheDocument()
  })

  it('renders empty state when no doctors', async () => {
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    await waitFor(() => {
      expect(screen.getByTestId('doctor-list-empty')).toBeInTheDocument()
    })

    expect(screen.getByTestId('doctor-list-empty')).toHaveTextContent('Nenhum médico encontrado.')
    expect(screen.queryByTestId('doctor-list-table')).not.toBeInTheDocument()
  })

  it('renders error state on failure', async () => {
    ;(doctorsService.getAll as jest.Mock).mockRejectedValue({ status: 500, title: 'Error', detail: 'Server error' })

    renderWithProviders(<DoctorList />)

    await waitFor(() => {
      expect(screen.getByTestId('doctor-list-error')).toBeInTheDocument()
    })
  })

  it('renders "Novo médico" button when user is ADMIN', () => {
    useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    expect(screen.getByTestId('doctor-list-new-button')).toBeInTheDocument()
  })

  it('hides "Novo médico" button when user is DOCTOR', () => {
    useAuthStore.setState({ user: makeUser(UserRole.DOCTOR) })
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    expect(screen.queryByTestId('doctor-list-new-button')).not.toBeInTheDocument()
  })

  it('hides "Novo médico" button when user is USER', () => {
    useAuthStore.setState({ user: makeUser(UserRole.USER) })
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    expect(screen.queryByTestId('doctor-list-new-button')).not.toBeInTheDocument()
  })

  it('renders search input', async () => {
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    expect(screen.getByTestId('doctor-list-search')).toBeInTheDocument()
  })

  it('opens delete dialog when delete button is clicked', async () => {
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    await waitFor(() => {
      expect(screen.getByTestId('doctor-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('doctor-delete-button-uuid-1'))

    expect(screen.getByTestId('delete-doctor-dialog-confirm')).toBeInTheDocument()
  })

  it('calls deleteDoctorUseCase and shows success message after confirm', async () => {
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })
    ;(deleteDoctorUseCase as jest.Mock).mockResolvedValue(undefined)

    renderWithProviders(<DoctorList />)

    await waitFor(() => {
      expect(screen.getByTestId('doctor-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('doctor-delete-button-uuid-1'))
    await userEvent.click(screen.getByTestId('delete-doctor-dialog-confirm'))

    await waitFor(() => {
      expect(screen.getByTestId('doctor-list-success')).toBeInTheDocument()
    })
  })

  it('closes delete dialog when cancel is clicked', async () => {
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    await waitFor(() => {
      expect(screen.getByTestId('doctor-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('doctor-delete-button-uuid-1'))
    expect(screen.getByTestId('delete-doctor-dialog-cancel')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('delete-doctor-dialog-cancel'))

    await waitFor(() => {
      expect(screen.queryByTestId('delete-doctor-dialog-cancel')).not.toBeInTheDocument()
    })
  })

  it('closes dialog and keeps doctor in list when deletion fails', async () => {
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })
    ;(deleteDoctorUseCase as jest.Mock).mockRejectedValue(new Error('Server error'))

    renderWithProviders(<DoctorList />)

    await waitFor(() => {
      expect(screen.getByTestId('doctor-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('doctor-delete-button-uuid-1'))
    await userEvent.click(screen.getByTestId('delete-doctor-dialog-confirm'))

    await waitFor(() => {
      expect(screen.queryByTestId('delete-doctor-dialog-confirm')).not.toBeInTheDocument()
    })

    expect(screen.getByTestId('doctor-name-uuid-1')).toBeInTheDocument()
  })

  it('renders view and edit links for each doctor', async () => {
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    await waitFor(() => {
      expect(screen.getByTestId('doctor-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('doctor-view-link-uuid-1')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-edit-link-uuid-1')).toBeInTheDocument()
  })

  it.each([UserRole.ADMIN, UserRole.DOCTOR, UserRole.USER])(
    'renders "Consultas" link pointing to the filtered agenda for %s',
    async (role) => {
      useAuthStore.setState({ user: makeUser(role) })
      ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

      renderWithProviders(<DoctorList />)

      await waitFor(() => {
        expect(screen.getByTestId('doctor-appointments-link-uuid-1')).toBeInTheDocument()
      })

      expect(screen.getByTestId('doctor-appointments-link-uuid-1')).toHaveAttribute(
        'href',
        expect.stringContaining('/appointments?doctor=uuid-1'),
      )
    },
  )

  it('shows "busca" empty message when search yields no results', async () => {
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    await userEvent.type(screen.getByTestId('doctor-list-search'), 'xyz')

    await waitFor(() => {
      expect(screen.getByTestId('doctor-list-empty')).toHaveTextContent(
        'Nenhum médico encontrado para a busca realizada.',
      )
    })
  })

  it('shows singular count when exactly 1 doctor is found', async () => {
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    await waitFor(() => {
      expect(screen.getByText('1 médico cadastrado')).toBeInTheDocument()
    })
  })

  it('renders a mobile card per doctor with name, email, CRM and specialties', async () => {
    useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    await waitFor(() => expect(screen.getByTestId('doctor-card-uuid-1')).toBeInTheDocument())

    expect(screen.getByTestId('doctor-card-uuid-1-title')).toHaveTextContent('Dr. João Silva')
    expect(screen.getByTestId('doctor-card-uuid-1-title')).toHaveTextContent('joao@example.com')
    expect(screen.getByTestId('doctor-card-specialty-badge-spec-uuid-1')).toHaveTextContent('Cardiologia')
    expect(screen.getByTestId('doctor-card-edit-link-uuid-1')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-card-view-link-uuid-1')).toBeInTheDocument()
  })

  it('mobile card shows Consultas link for roles that can view appointments', async () => {
    useAuthStore.setState({ user: makeUser(UserRole.USER) })
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    await waitFor(() => expect(screen.getByTestId('doctor-card-appointments-link-uuid-1')).toBeInTheDocument())
  })

  it('clicking delete on a mobile card opens the delete dialog', async () => {
    useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    await waitFor(() => expect(screen.getByTestId('doctor-card-delete-button-uuid-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('doctor-card-delete-button-uuid-1'))

    expect(screen.getByTestId('delete-doctor-dialog')).toBeInTheDocument()
  })
})
