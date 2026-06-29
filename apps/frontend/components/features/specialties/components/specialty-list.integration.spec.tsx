jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/stores/auth.store')
jest.mock('../services/specialties.service')
jest.mock('../use-cases/delete-specialty.use-case')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { UserRole } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { specialtiesService } from '../services/specialties.service'
import { deleteSpecialtyUseCase } from '../use-cases/delete-specialty.use-case'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { SpecialtyList } from './specialty-list'

const mockPush = jest.fn()

function mockAuthStoreAs(role: UserRole) {
  ;(useAuthStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: { user: { id: string; fullName: string; email: string; role: UserRole } }) => unknown) =>
      selector({ user: { id: 'user-uuid', fullName: 'Test User', email: 'test@example.com', role } }),
  )
}

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  name: 'Cardiologia',
  description: 'Especialidade do coração',
  clinicCount: 0,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-16T10:00:00.000Z',
  ...overrides,
})

const makePaginatedResponse = (items = [makeDto()]) => ({
  data: items,
  total: items.length,
  page: 1,
  limit: 20,
})

describe('SpecialtyList (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  describe('as PLATFORM_ADMIN', () => {
    beforeEach(() => mockAuthStoreAs(UserRole.PLATFORM_ADMIN))

    it('renders skeleton while loading', () => {
      ;(specialtiesService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

      renderWithProviders(<SpecialtyList />)

      expect(screen.getByTestId('specialty-list-skeleton')).toBeInTheDocument()
    })

    it('renders table with specialties on success', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())

      renderWithProviders(<SpecialtyList />)

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-table')).toBeInTheDocument()
      })

      expect(screen.getByTestId('specialty-name-uuid-1')).toHaveTextContent('Cardiologia')
      expect(screen.getByTestId('specialty-description-uuid-1')).toHaveTextContent('Especialidade do coração')
    })

    it('shows "—" when specialty description is null', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(
        makePaginatedResponse([makeDto({ description: null })]),
      )

      renderWithProviders(<SpecialtyList />)

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-table')).toBeInTheDocument()
      })

      expect(screen.getByTestId('specialty-description-uuid-1')).toHaveTextContent('—')
    })

    it('shows clinic count for each specialty', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(
        makePaginatedResponse([makeDto({ clinicCount: 5 })]),
      )

      renderWithProviders(<SpecialtyList />)

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-table')).toBeInTheDocument()
      })

      expect(screen.getByTestId('specialty-clinic-count-uuid-1')).toHaveTextContent('5')
    })

    it('renders empty state when no specialties', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse([]))

      renderWithProviders(<SpecialtyList />)

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-empty')).toBeInTheDocument()
      })

      expect(screen.getByTestId('specialty-list-empty')).toHaveTextContent('Nenhuma especialidade encontrada.')
      expect(screen.queryByTestId('specialty-list-table')).not.toBeInTheDocument()
    })

    it('renders error state on failure', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockRejectedValue({ status: 500, title: 'Error' })

      renderWithProviders(<SpecialtyList />)

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-error')).toBeInTheDocument()
      })
    })

    it('renders "Nova especialidade" button for PLATFORM_ADMIN', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse([]))

      renderWithProviders(<SpecialtyList />)

      expect(screen.getByTestId('specialty-list-new-button')).toBeInTheDocument()
    })

    it('renders edit and delete actions for PLATFORM_ADMIN', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())

      renderWithProviders(<SpecialtyList />)

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-table')).toBeInTheDocument()
      })

      expect(screen.getByTestId('specialty-delete-button-uuid-1')).toBeInTheDocument()
      expect(screen.getByTestId('specialty-edit-link-uuid-1')).toBeInTheDocument()
    })

    it('opens delete dialog when delete button is clicked', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())

      renderWithProviders(<SpecialtyList />)

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-table')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByTestId('specialty-delete-button-uuid-1'))

      expect(screen.getByTestId('delete-specialty-dialog-confirm')).toBeInTheDocument()
    })

    it('calls deleteSpecialtyUseCase and shows success message after confirm', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())
      ;(deleteSpecialtyUseCase as jest.Mock).mockResolvedValue(undefined)

      renderWithProviders(<SpecialtyList />)

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-table')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByTestId('specialty-delete-button-uuid-1'))
      await userEvent.click(screen.getByTestId('delete-specialty-dialog-confirm'))

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-success')).toBeInTheDocument()
      })
    })

    it('closes delete dialog when cancel is clicked', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())

      renderWithProviders(<SpecialtyList />)

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-table')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByTestId('specialty-delete-button-uuid-1'))
      expect(screen.getByTestId('delete-specialty-dialog-cancel')).toBeInTheDocument()

      await userEvent.click(screen.getByTestId('delete-specialty-dialog-cancel'))

      await waitFor(() => {
        expect(screen.queryByTestId('delete-specialty-dialog-cancel')).not.toBeInTheDocument()
      })
    })

    it('shows 409 conflict error message when specialty is linked to doctors', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())
      ;(deleteSpecialtyUseCase as jest.Mock).mockRejectedValue({ status: 409 })

      renderWithProviders(<SpecialtyList />)

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-table')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByTestId('specialty-delete-button-uuid-1'))
      await userEvent.click(screen.getByTestId('delete-specialty-dialog-confirm'))

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-delete-error')).toHaveTextContent(
          'Não é possível excluir "Cardiologia" pois ela está vinculada a médicos ativos.',
        )
      })
    })

    it('closes dialog and keeps specialty in list when deletion fails', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())
      ;(deleteSpecialtyUseCase as jest.Mock).mockRejectedValue(new Error('Server error'))

      renderWithProviders(<SpecialtyList />)

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-table')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByTestId('specialty-delete-button-uuid-1'))
      await userEvent.click(screen.getByTestId('delete-specialty-dialog-confirm'))

      await waitFor(() => {
        expect(screen.queryByTestId('delete-specialty-dialog-confirm')).not.toBeInTheDocument()
      })

      expect(screen.getByTestId('specialty-name-uuid-1')).toBeInTheDocument()
    })

    it('renders view link for each specialty', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())

      renderWithProviders(<SpecialtyList />)

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-table')).toBeInTheDocument()
      })

      expect(screen.getByTestId('specialty-view-link-uuid-1')).toBeInTheDocument()
    })

    it('shows "busca" empty message when search yields no results', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse([]))

      renderWithProviders(<SpecialtyList />)

      await userEvent.type(screen.getByTestId('specialty-list-search'), 'xyz')

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-empty')).toHaveTextContent(
          'Nenhuma especialidade encontrada para a busca realizada.',
        )
      })
    })
  })

  describe('as DOCTOR', () => {
    beforeEach(() => mockAuthStoreAs(UserRole.DOCTOR))

    it('hides "Nova especialidade" button', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse([]))

      renderWithProviders(<SpecialtyList />)

      expect(screen.queryByTestId('specialty-list-new-button')).not.toBeInTheDocument()
    })

    it('hides edit and delete actions', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())

      renderWithProviders(<SpecialtyList />)

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-table')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('specialty-delete-button-uuid-1')).not.toBeInTheDocument()
      expect(screen.queryByTestId('specialty-edit-link-uuid-1')).not.toBeInTheDocument()
    })

    it('renders view link', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())

      renderWithProviders(<SpecialtyList />)

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-table')).toBeInTheDocument()
      })

      expect(screen.getByTestId('specialty-view-link-uuid-1')).toBeInTheDocument()
    })
  })

  describe('as USER', () => {
    beforeEach(() => mockAuthStoreAs(UserRole.USER))

    it('hides "Nova especialidade" button', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse([]))

      renderWithProviders(<SpecialtyList />)

      expect(screen.queryByTestId('specialty-list-new-button')).not.toBeInTheDocument()
    })

    it('hides edit and delete actions', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makePaginatedResponse())

      renderWithProviders(<SpecialtyList />)

      await waitFor(() => {
        expect(screen.getByTestId('specialty-list-table')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('specialty-delete-button-uuid-1')).not.toBeInTheDocument()
      expect(screen.queryByTestId('specialty-edit-link-uuid-1')).not.toBeInTheDocument()
    })
  })
})
