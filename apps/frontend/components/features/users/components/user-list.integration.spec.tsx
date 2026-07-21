jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/stores/auth.store')
jest.mock('../services/users.service')
jest.mock('../use-cases/delete-user.use-case')
jest.mock('@/lib/slug-context', () => ({ useSlug: () => 'test-clinic', useBasePath: () => '/test-clinic' }))

import { screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { UserRole } from '@app/shared'
import { userService } from '../services/users.service'
import { deleteUserUseCase } from '../use-cases/delete-user.use-case'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { UserList } from './user-list'

const mockPush = jest.fn()

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  fullName: 'Alice Costa',
  email: 'alice@example.com',
  role: UserRole.USER,
  isActive: true,
  isProfessional: false,
  isPatient: false,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-16T10:00:00.000Z',
  ...overrides,
})

function mockAuthStore(userId = 'current-user-id') {
  ;(useAuthStore as unknown as jest.Mock).mockImplementation((selector: (s: object) => unknown) =>
    selector({ user: { id: userId, fullName: 'Current User', email: 'current@example.com' }, setUser: jest.fn() }),
  )
}

describe('UserList (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    mockAuthStore()
  })

  it('renders skeleton while loading', () => {
    ;(userService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<UserList />)

    expect(screen.getByTestId('user-list-skeleton')).toBeInTheDocument()
  })

  it('renders table with users on success', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('user-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('user-name-uuid-1')).toHaveTextContent('Alice Costa')
    expect(screen.getByTestId('user-email-uuid-1')).toHaveTextContent('alice@example.com')
  })

  it('renders empty state when no users', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('user-list-empty')).toBeInTheDocument()
    })
  })

  it('renders error state on failure', async () => {
    ;(userService.getAll as jest.Mock).mockRejectedValue({ status: 500, title: 'Error', detail: 'Server error' })

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('user-list-error')).toBeInTheDocument()
    })
  })

  it('disables delete button for current logged-in user', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto({ id: 'current-user-id' })], total: 1, page: 1, limit: 20 })
    mockAuthStore('current-user-id')

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('user-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('user-delete-button-current-user-id')).toBeDisabled()
  })

  it('opens delete dialog when delete button is clicked', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('user-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('user-delete-button-uuid-1'))

    expect(screen.getByTestId('delete-user-dialog-confirm')).toBeInTheDocument()
  })

  it('calls deleteUserUseCase and shows success message after confirm', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })
    ;(deleteUserUseCase as jest.Mock).mockResolvedValue(undefined)

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('user-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('user-delete-button-uuid-1'))
    await userEvent.click(screen.getByTestId('delete-user-dialog-confirm'))

    await waitFor(() => {
      expect(screen.getByTestId('user-list-success')).toBeInTheDocument()
    })
  })

  it('closes delete dialog when cancel is clicked', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('user-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('user-delete-button-uuid-1'))
    expect(screen.getByTestId('delete-user-dialog-cancel')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('delete-user-dialog-cancel'))

    await waitFor(() => {
      expect(screen.queryByTestId('delete-user-dialog-cancel')).not.toBeInTheDocument()
    })
  })

  it('closes dialog and keeps user in list when deletion fails', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })
    ;(deleteUserUseCase as jest.Mock).mockRejectedValue(new Error('Server error'))

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('user-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('user-delete-button-uuid-1'))
    await userEvent.click(screen.getByTestId('delete-user-dialog-confirm'))

    await waitFor(() => {
      expect(screen.queryByTestId('delete-user-dialog-confirm')).not.toBeInTheDocument()
    })

    expect(screen.getByTestId('user-name-uuid-1')).toBeInTheDocument()
  })

  it('renders single initial for single-word name', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto({ fullName: 'Alice' })], total: 1, page: 1, limit: 20 })

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('user-name-uuid-1')).toHaveTextContent('Alice')
    })
  })

  it('renders "Inativo" badge for inactive user', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto({ isActive: false })], total: 1, page: 1, limit: 20 })

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('user-status-uuid-1')).toHaveTextContent('Inativo')
    })
  })

  it('renders "Ativo" badge for active user', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto({ isActive: true })], total: 1, page: 1, limit: 20 })

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('user-status-uuid-1')).toHaveTextContent('Ativo')
    })
  })

  it('renders "Novo usuário" link', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<UserList />)

    expect(screen.getByTestId('user-list-new-button')).toBeInTheDocument()
  })

  it('renders edit text link pointing to edit page', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('user-list-table')).toBeInTheDocument()
    })

    const editLink = screen.getByTestId('user-edit-link-uuid-1')
    expect(editLink).toHaveTextContent('Editar')
    expect(editLink).toHaveAttribute('href', '/test-clinic/users/uuid-1/edit')
  })

  it('renders view chevron linking to user details page', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('user-list-table')).toBeInTheDocument()
    })

    const viewLink = screen.getByTestId('user-view-link-uuid-1')
    expect(viewLink).toHaveAttribute('href', '/test-clinic/users/uuid-1')
  })

  it('renders search input', () => {
    ;(userService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<UserList />)

    expect(screen.getByTestId('user-list-search')).toBeInTheDocument()
  })

  it('calls getAll with search param after debounce', async () => {
    jest.useFakeTimers()
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<UserList />)

    fireEvent.change(screen.getByTestId('user-list-search'), { target: { value: 'Alice' } })

    act(() => { jest.advanceTimersByTime(300) })

    await waitFor(() => {
      expect(userService.getAll).toHaveBeenCalledWith({ search: 'Alice' })
    })

    jest.useRealTimers()
  })

  it('shows dash when user has no profile', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({
      data: [makeDto({ isProfessional: false, isPatient: false })],
      total: 1,
      page: 1,
      limit: 20,
    })

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('user-profiles-uuid-1')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('user-profile-professional-uuid-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('user-profile-patient-uuid-1')).not.toBeInTheDocument()
    expect(screen.getByTestId('user-profiles-uuid-1')).toHaveTextContent('—')
  })

  it('shows Profissional badge when user is a professional', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({
      data: [makeDto({ isProfessional: true, isPatient: false })],
      total: 1,
      page: 1,
      limit: 20,
    })

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('user-profile-professional-uuid-1')).toBeInTheDocument()
    })

    expect(screen.getByTestId('user-profile-professional-uuid-1')).toHaveTextContent('Profissional')
    expect(screen.queryByTestId('user-profile-patient-uuid-1')).not.toBeInTheDocument()
  })

  it('shows Paciente badge when user is a patient', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({
      data: [makeDto({ isProfessional: false, isPatient: true })],
      total: 1,
      page: 1,
      limit: 20,
    })

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('user-profile-patient-uuid-1')).toBeInTheDocument()
    })

    expect(screen.getByTestId('user-profile-patient-uuid-1')).toHaveTextContent('Paciente')
    expect(screen.queryByTestId('user-profile-professional-uuid-1')).not.toBeInTheDocument()
  })

  it('shows both badges when user has doctor and patient profiles', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({
      data: [makeDto({ isProfessional: true, isPatient: true })],
      total: 1,
      page: 1,
      limit: 20,
    })

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByTestId('user-profile-professional-uuid-1')).toBeInTheDocument()
    })

    expect(screen.getByTestId('user-profile-professional-uuid-1')).toHaveTextContent('Profissional')
    expect(screen.getByTestId('user-profile-patient-uuid-1')).toHaveTextContent('Paciente')
  })

  it('shows singular count when exactly 1 user is found', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<UserList />)

    await waitFor(() => {
      expect(screen.getByText('1 usuário cadastrado')).toBeInTheDocument()
    })
  })

  it('renders a mobile card per user with name, email and actions', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<UserList />)

    await waitFor(() => expect(screen.getByTestId('user-card-uuid-1')).toBeInTheDocument())

    expect(screen.getByTestId('user-card-uuid-1-title')).toHaveTextContent('Alice Costa')
    expect(screen.getByTestId('user-card-uuid-1-title')).toHaveTextContent('alice@example.com')
    expect(screen.getByTestId('user-card-edit-link-uuid-1')).toBeInTheDocument()
    expect(screen.getByTestId('user-card-view-link-uuid-1')).toBeInTheDocument()
  })

  it('mobile card delete button is disabled for the current user', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })
    mockAuthStore('uuid-1')

    renderWithProviders(<UserList />)

    await waitFor(() => expect(screen.getByTestId('user-card-delete-button-uuid-1')).toBeInTheDocument())

    expect(screen.getByTestId('user-card-delete-button-uuid-1')).toBeDisabled()
  })

  it('clicking delete on a mobile card opens the delete dialog', async () => {
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<UserList />)

    await waitFor(() => expect(screen.getByTestId('user-card-delete-button-uuid-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('user-card-delete-button-uuid-1'))

    expect(screen.getByTestId('delete-user-dialog')).toBeInTheDocument()
  })
})
