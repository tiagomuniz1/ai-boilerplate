jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/professionals.service')
jest.mock('../use-cases/delete-professional.use-case')

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { CouncilType, UserRole } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { professionalsService } from '../services/professionals.service'
import { deleteProfessionalUseCase } from '../use-cases/delete-professional.use-case'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ProfessionalList } from './professional-list'

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
  user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@example.com', isActive: true },
  registrations: [{ id: 'crm-uuid-1', councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia', registryNumber: null }],
  bio: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-16T10:00:00.000Z',
  ...overrides,
})

describe('ProfessionalList (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
  })

  it('renders skeleton while loading', () => {
    ;(professionalsService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<ProfessionalList />)

    expect(screen.getByTestId('professional-list-skeleton')).toBeInTheDocument()
  })

  it('renders table with professionals on success', async () => {
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => {
      expect(screen.getByTestId('professional-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('professional-name-uuid-1')).toHaveTextContent('Dr. João Silva')
    expect(screen.getByTestId('professional-email-uuid-1')).toHaveTextContent('joao@example.com')
    expect(screen.getByTestId('professional-crm-uuid-1')).toHaveTextContent('12345/SP')
    expect(screen.getByTestId('professional-specialty-badge-spec-uuid-1')).toHaveTextContent('Cardiologia')
  })

  it('shows the primary CRM with a +N indicator when the professional has multiple CRMs', async () => {
    const dto = makeDto({
      registrations: [
        { id: 'crm-1', number: '12345', state: 'SP', isPrimary: true },
        { id: 'crm-2', number: '54321', state: 'RJ', isPrimary: false },
      ],
    })
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => expect(screen.getByTestId('professional-list-table')).toBeInTheDocument())
    expect(screen.getByTestId('professional-crm-uuid-1')).toHaveTextContent('12345/SP +1')
  })

  it('falls back to the first CRM when none is marked primary', async () => {
    const dto = makeDto({ registrations: [{ id: 'crm-1', number: '99999', state: 'MG', isPrimary: false }] })
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => expect(screen.getByTestId('professional-list-table')).toBeInTheDocument())
    expect(screen.getByTestId('professional-crm-uuid-1')).toHaveTextContent('99999/MG')
  })

  it('shows a dash when the professional has no CRM', async () => {
    const dto = makeDto({ registrations: [] })
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => expect(screen.getByTestId('professional-list-table')).toBeInTheDocument())
    expect(screen.getByTestId('professional-crm-uuid-1')).toHaveTextContent('—')
  })

  it('renders 1 badge when professional has 1 specialty', async () => {
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => {
      expect(screen.getByTestId('professional-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('professional-specialty-badge-spec-uuid-1')).toBeInTheDocument()
  })

  it('renders 2 badges when professional has 2 specialties', async () => {
    const dto = makeDto({
      specialties: [
        { id: 'spec-uuid-1', name: 'Cardiologia' },
        { id: 'spec-uuid-2', name: 'Neurologia' },
      ],
    })
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => {
      expect(screen.getByTestId('professional-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('professional-specialty-badge-spec-uuid-1')).toBeInTheDocument()
    expect(screen.getByTestId('professional-specialty-badge-spec-uuid-2')).toBeInTheDocument()
    expect(screen.queryByText(/\+\d+ mais/)).not.toBeInTheDocument()
  })

  it('renders 2 badges + overflow indicator when professional has 4 specialties', async () => {
    const dto = makeDto({
      specialties: [
        { id: 'spec-uuid-1', name: 'Cardiologia' },
        { id: 'spec-uuid-2', name: 'Neurologia' },
        { id: 'spec-uuid-3', name: 'Ortopedia' },
        { id: 'spec-uuid-4', name: 'Pediatria' },
      ],
    })
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => {
      expect(screen.getByTestId('professional-list-table')).toBeInTheDocument()
    })

    const table = screen.getByTestId('professional-list-table')
    expect(within(table).getByTestId('professional-specialty-badge-spec-uuid-1')).toBeInTheDocument()
    expect(within(table).getByTestId('professional-specialty-badge-spec-uuid-2')).toBeInTheDocument()
    expect(within(table).queryByTestId('professional-specialty-badge-spec-uuid-3')).not.toBeInTheDocument()
    expect(within(table).queryByTestId('professional-specialty-badge-spec-uuid-4')).not.toBeInTheDocument()
    expect(within(table).getByText('+2 mais')).toBeInTheDocument()
  })

  it('shows the occupation label when a CRM professional has no specialty (generalist)', async () => {
    const dto = makeDto({ specialties: [] })
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => {
      expect(screen.getByTestId('professional-list-table')).toBeInTheDocument()
    })

    expect(screen.queryByTestId(/professional-specialty-badge-/)).not.toBeInTheDocument()
    expect(screen.getByTestId('professional-occupation-uuid-1')).toHaveTextContent('Médico')
  })

  it('shows the occupation label instead of an empty specialty cell for a non-doctor professional', async () => {
    const dto = makeDto({
      registrations: [{ id: 'reg-1', councilType: CouncilType.CRN, number: '999', state: 'SP', isPrimary: true }],
      specialties: [],
    })
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => {
      expect(screen.getByTestId('professional-list-table')).toBeInTheDocument()
    })

    expect(screen.queryByTestId(/professional-specialty-badge-/)).not.toBeInTheDocument()
    expect(screen.getByTestId('professional-occupation-uuid-1')).toHaveTextContent('Nutricionista')
  })

  it('renders empty state when no professionals', async () => {
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => {
      expect(screen.getByTestId('professional-list-empty')).toBeInTheDocument()
    })

    expect(screen.getByTestId('professional-list-empty')).toHaveTextContent('Nenhum profissional encontrado.')
    expect(screen.queryByTestId('professional-list-table')).not.toBeInTheDocument()
  })

  it('renders error state on failure', async () => {
    ;(professionalsService.getAll as jest.Mock).mockRejectedValue({ status: 500, title: 'Error', detail: 'Server error' })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => {
      expect(screen.getByTestId('professional-list-error')).toBeInTheDocument()
    })
  })

  it('renders "Novo profissional" button when user is ADMIN', () => {
    useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    expect(screen.getByTestId('professional-list-new-button')).toBeInTheDocument()
  })

  it('hides "Novo profissional" button when user is PROFESSIONAL', () => {
    useAuthStore.setState({ user: makeUser(UserRole.PROFESSIONAL) })
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    expect(screen.queryByTestId('professional-list-new-button')).not.toBeInTheDocument()
  })

  it('hides "Novo profissional" button when user is USER', () => {
    useAuthStore.setState({ user: makeUser(UserRole.USER) })
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    expect(screen.queryByTestId('professional-list-new-button')).not.toBeInTheDocument()
  })

  it('renders search input', async () => {
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    expect(screen.getByTestId('professional-list-search')).toBeInTheDocument()
  })

  it('opens delete dialog when delete button is clicked', async () => {
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => {
      expect(screen.getByTestId('professional-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('professional-delete-button-uuid-1'))

    expect(screen.getByTestId('delete-professional-dialog-confirm')).toBeInTheDocument()
  })

  it('calls deleteProfessionalUseCase and shows success message after confirm', async () => {
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })
    ;(deleteProfessionalUseCase as jest.Mock).mockResolvedValue(undefined)

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => {
      expect(screen.getByTestId('professional-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('professional-delete-button-uuid-1'))
    await userEvent.click(screen.getByTestId('delete-professional-dialog-confirm'))

    await waitFor(() => {
      expect(screen.getByTestId('professional-list-success')).toBeInTheDocument()
    })
  })

  it('closes delete dialog when cancel is clicked', async () => {
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => {
      expect(screen.getByTestId('professional-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('professional-delete-button-uuid-1'))
    expect(screen.getByTestId('delete-professional-dialog-cancel')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('delete-professional-dialog-cancel'))

    await waitFor(() => {
      expect(screen.queryByTestId('delete-professional-dialog-cancel')).not.toBeInTheDocument()
    })
  })

  it('closes dialog and keeps professional in list when deletion fails', async () => {
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })
    ;(deleteProfessionalUseCase as jest.Mock).mockRejectedValue(new Error('Server error'))

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => {
      expect(screen.getByTestId('professional-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('professional-delete-button-uuid-1'))
    await userEvent.click(screen.getByTestId('delete-professional-dialog-confirm'))

    await waitFor(() => {
      expect(screen.queryByTestId('delete-professional-dialog-confirm')).not.toBeInTheDocument()
    })

    expect(screen.getByTestId('professional-name-uuid-1')).toBeInTheDocument()
  })

  it('renders view and edit links for each professional', async () => {
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => {
      expect(screen.getByTestId('professional-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('professional-view-link-uuid-1')).toBeInTheDocument()
    expect(screen.getByTestId('professional-edit-link-uuid-1')).toBeInTheDocument()
  })

  it.each([UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.USER])(
    'renders "Consultas" link pointing to the filtered agenda for %s',
    async (role) => {
      useAuthStore.setState({ user: makeUser(role) })
      ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

      renderWithProviders(<ProfessionalList />)

      await waitFor(() => {
        expect(screen.getByTestId('professional-appointments-link-uuid-1')).toBeInTheDocument()
      })

      expect(screen.getByTestId('professional-appointments-link-uuid-1')).toHaveAttribute(
        'href',
        expect.stringContaining('/appointments?doctor=uuid-1'),
      )
    },
  )

  it('shows "busca" empty message when search yields no results', async () => {
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await userEvent.type(screen.getByTestId('professional-list-search'), 'xyz')

    await waitFor(() => {
      expect(screen.getByTestId('professional-list-empty')).toHaveTextContent(
        'Nenhum profissional encontrado para a busca realizada.',
      )
    })
  })

  it('shows singular count when exactly 1 professional is found', async () => {
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => {
      expect(screen.getByText('1 profissional cadastrado')).toBeInTheDocument()
    })
  })

  it('renders a mobile card per professional with name, email, CRM and specialties', async () => {
    useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => expect(screen.getByTestId('professional-card-uuid-1')).toBeInTheDocument())

    expect(screen.getByTestId('professional-card-uuid-1-title')).toHaveTextContent('Dr. João Silva')
    expect(screen.getByTestId('professional-card-uuid-1-title')).toHaveTextContent('joao@example.com')
    expect(screen.getByTestId('professional-card-specialty-badge-spec-uuid-1')).toHaveTextContent('Cardiologia')
    expect(screen.getByTestId('professional-card-edit-link-uuid-1')).toBeInTheDocument()
    expect(screen.getByTestId('professional-card-view-link-uuid-1')).toBeInTheDocument()
  })

  it('mobile card shows the occupation label instead of an empty specialty for a non-doctor professional', async () => {
    useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
    const dto = makeDto({
      registrations: [{ id: 'reg-1', councilType: CouncilType.CREFITO, number: '999', state: 'SP', isPrimary: true }],
      specialties: [],
    })
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => expect(screen.getByTestId('professional-card-uuid-1')).toBeInTheDocument())

    expect(screen.getByTestId('professional-card-occupation-uuid-1')).toHaveTextContent('Fisioterapeuta')
  })

  it('mobile card shows Consultas link for roles that can view appointments', async () => {
    useAuthStore.setState({ user: makeUser(UserRole.USER) })
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => expect(screen.getByTestId('professional-card-appointments-link-uuid-1')).toBeInTheDocument())
  })

  it('clicking delete on a mobile card opens the delete dialog', async () => {
    useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<ProfessionalList />)

    await waitFor(() => expect(screen.getByTestId('professional-card-delete-button-uuid-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('professional-card-delete-button-uuid-1'))

    expect(screen.getByTestId('delete-professional-dialog')).toBeInTheDocument()
  })
})
