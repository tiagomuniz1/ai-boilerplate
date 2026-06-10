jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/clinics.service')
jest.mock('@/stores/auth.store')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { UserRole } from '@app/shared'
import { clinicsService } from '../services/clinics.service'
import { useAuthStore } from '@/stores/auth.store'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ClinicList } from './clinic-list'

const mockReplace = jest.fn()
const mockPlatformAdminUser = { id: 'auth-uuid-1', fullName: 'Platform Admin', email: 'platform@umi.dev', role: UserRole.PLATFORM_ADMIN, clinicId: null }

function mockAuth(role: UserRole) {
  const user = { ...mockPlatformAdminUser, role }
  ;(useAuthStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: { user: typeof user }) => unknown) => selector({ user }),
  )
}

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-16T10:00:00.000Z',
  ...overrides,
})

const makePaginated = (dtos: ReturnType<typeof makeDto>[] = [makeDto()]) => ({
  data: dtos,
  total: dtos.length,
  page: 1,
  limit: 20,
})

describe('ClinicList (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), replace: mockReplace })
    mockAuth(UserRole.PLATFORM_ADMIN)
  })

  it('renders skeleton while loading', () => {
    ;(clinicsService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<ClinicList />)

    expect(screen.getByTestId('clinic-list-skeleton')).toBeInTheDocument()
  })

  it('renders table with clinics on success', async () => {
    ;(clinicsService.getAll as jest.Mock).mockResolvedValue(makePaginated())

    renderWithProviders(<ClinicList />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('clinic-name-uuid-1')).toHaveTextContent('Clínica do Coração')
    expect(screen.getByTestId('clinic-slug-uuid-1')).toHaveTextContent('clinica-do-coracao')
  })

  it('renders active status badge for active clinic', async () => {
    ;(clinicsService.getAll as jest.Mock).mockResolvedValue(makePaginated([makeDto({ isActive: true })]))

    renderWithProviders(<ClinicList />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('clinic-status-uuid-1')).toHaveTextContent('Ativa')
    expect(screen.queryByTestId('clinic-inactive-badge-uuid-1')).not.toBeInTheDocument()
  })

  it('renders inactive badge for inactive clinic', async () => {
    ;(clinicsService.getAll as jest.Mock).mockResolvedValue(makePaginated([makeDto({ isActive: false })]))

    renderWithProviders(<ClinicList />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('clinic-inactive-badge-uuid-1')).toHaveTextContent('Inativa')
  })

  it('renders empty state when no clinics', async () => {
    ;(clinicsService.getAll as jest.Mock).mockResolvedValue(makePaginated([]))

    renderWithProviders(<ClinicList />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-list-empty')).toBeInTheDocument()
    })

    expect(screen.getByTestId('clinic-list-empty')).toHaveTextContent('Nenhuma clínica encontrada.')
    expect(screen.queryByTestId('clinic-list-table')).not.toBeInTheDocument()
  })

  it('renders error state on failure', async () => {
    ;(clinicsService.getAll as jest.Mock).mockRejectedValue({ status: 500, title: 'Error', detail: 'Server error' })

    renderWithProviders(<ClinicList />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-list-error')).toBeInTheDocument()
    })
  })

  it('renders "Nova clínica" button', () => {
    ;(clinicsService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<ClinicList />)

    expect(screen.getByTestId('clinic-list-new-button')).toBeInTheDocument()
  })

  it('renders search input', () => {
    ;(clinicsService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<ClinicList />)

    expect(screen.getByTestId('clinic-list-search')).toBeInTheDocument()
  })

  it('renders view, edit and add-user links for each clinic', async () => {
    ;(clinicsService.getAll as jest.Mock).mockResolvedValue(makePaginated())

    renderWithProviders(<ClinicList />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('clinic-view-link-uuid-1')).toBeInTheDocument()
    expect(screen.getByTestId('clinic-edit-link-uuid-1')).toBeInTheDocument()
    expect(screen.getByTestId('clinic-add-user-link-uuid-1')).toBeInTheDocument()
  })

  it('shows busca empty message when search yields no results', async () => {
    ;(clinicsService.getAll as jest.Mock).mockResolvedValue(makePaginated([]))

    renderWithProviders(<ClinicList />)

    await userEvent.type(screen.getByTestId('clinic-list-search'), 'xyz')

    await waitFor(() => {
      expect(screen.getByTestId('clinic-list-empty')).toHaveTextContent(
        'Nenhuma clínica encontrada para a busca realizada.',
      )
    })
  })

  it('redirects to /dashboard when user is not PLATFORM_ADMIN', () => {
    ;(clinicsService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))
    mockAuth(UserRole.ADMIN)

    renderWithProviders(<ClinicList />)

    expect(mockReplace).toHaveBeenCalledWith('/dashboard')
  })

  it('does not redirect when user is PLATFORM_ADMIN', async () => {
    ;(clinicsService.getAll as jest.Mock).mockResolvedValue(makePaginated([]))
    mockAuth(UserRole.PLATFORM_ADMIN)

    renderWithProviders(<ClinicList />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-list-empty')).toBeInTheDocument()
    })

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('shows count of clinics when loaded', async () => {
    ;(clinicsService.getAll as jest.Mock).mockResolvedValue(makePaginated())

    renderWithProviders(<ClinicList />)

    await waitFor(() => {
      expect(screen.getByText('1 clínica cadastrada')).toBeInTheDocument()
    })
  })

  it('shows plural count when multiple clinics', async () => {
    ;(clinicsService.getAll as jest.Mock).mockResolvedValue(
      makePaginated([makeDto(), makeDto({ id: 'uuid-2', slug: 'outra-clinica' })]),
    )

    renderWithProviders(<ClinicList />)

    await waitFor(() => {
      expect(screen.getByText('2 clínicas cadastradas')).toBeInTheDocument()
    })
  })
})
