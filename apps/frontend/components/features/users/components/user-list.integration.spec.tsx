jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/stores/auth.store')
jest.mock('../services/users.service')
jest.mock('../use-cases/delete-user.use-case')

import { screen, waitFor } from '@testing-library/react'
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
})
