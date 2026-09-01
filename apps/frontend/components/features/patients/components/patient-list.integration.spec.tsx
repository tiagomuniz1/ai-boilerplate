jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/patients.service')
jest.mock('../use-cases/delete-patient.use-case')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { PatientGender, UserRole } from '@app/shared'
import { patientsService } from '../services/patients.service'
import { deletePatientUseCase } from '../use-cases/delete-patient.use-case'
import { useAuthStore } from '@/stores/auth.store'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PatientList } from './patient-list'

const mockPush = jest.fn()

const makeUser = (role: UserRole) => ({
  id: 'user-uuid',
  fullName: 'Test User',
  email: 'test@example.com',
  role,
  clinicId: 'clinic-uuid',
})

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'João Silva', email: 'joao@example.com', isActive: true },
  phoneNumber: '11999999999',
  birthDate: '1990-05-15',
  documentNumber: '12345678901',
  gender: PatientGender.MALE,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-16T10:00:00.000Z',
  ...overrides,
})

describe('PatientList (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
  })

  it('renders skeleton while loading', () => {
    ;(patientsService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<PatientList />)

    expect(screen.getByTestId('patient-list-skeleton')).toBeInTheDocument()
  })

  it('renders table with patients on success', async () => {
    ;(patientsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<PatientList />)

    await waitFor(() => {
      expect(screen.getByTestId('patient-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('patient-name-uuid-1')).toHaveTextContent('João Silva')
    expect(screen.getByTestId('patient-email-uuid-1')).toHaveTextContent('joao@example.com')
    expect(screen.getByTestId('patient-phone-uuid-1')).toHaveTextContent('(11) 99999-9999')
    expect(screen.getByTestId('patient-gender-uuid-1')).toHaveTextContent('Masculino')
  })

  it('renders empty state when no patients', async () => {
    ;(patientsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<PatientList />)

    await waitFor(() => {
      expect(screen.getByTestId('patient-list-empty')).toBeInTheDocument()
    })

    expect(screen.getByTestId('patient-list-empty')).toHaveTextContent('Nenhum paciente encontrado.')
    expect(screen.queryByTestId('patient-list-table')).not.toBeInTheDocument()
  })

  it('renders error state on failure', async () => {
    ;(patientsService.getAll as jest.Mock).mockRejectedValue({ status: 500, title: 'Error', detail: 'Server error' })

    renderWithProviders(<PatientList />)

    await waitFor(() => {
      expect(screen.getByTestId('patient-list-error')).toBeInTheDocument()
    })
  })

  it('renders "Novo paciente" button', async () => {
    ;(patientsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<PatientList />)

    expect(screen.getByTestId('patient-list-new-button')).toBeInTheDocument()
  })

  it('renders search input', async () => {
    ;(patientsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<PatientList />)

    expect(screen.getByTestId('patient-list-search')).toBeInTheDocument()
  })

  it('opens delete dialog when delete button is clicked', async () => {
    ;(patientsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<PatientList />)

    await waitFor(() => {
      expect(screen.getByTestId('patient-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('patient-delete-button-uuid-1'))

    expect(screen.getByTestId('delete-patient-dialog-confirm')).toBeInTheDocument()
  })

  it('calls deletePatientUseCase and shows success message after confirm', async () => {
    ;(patientsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })
    ;(deletePatientUseCase as jest.Mock).mockResolvedValue(undefined)

    renderWithProviders(<PatientList />)

    await waitFor(() => {
      expect(screen.getByTestId('patient-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('patient-delete-button-uuid-1'))
    await userEvent.click(screen.getByTestId('delete-patient-dialog-confirm'))

    await waitFor(() => {
      expect(screen.getByTestId('patient-list-success')).toBeInTheDocument()
    })
  })

  it('closes delete dialog when cancel is clicked', async () => {
    ;(patientsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<PatientList />)

    await waitFor(() => {
      expect(screen.getByTestId('patient-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('patient-delete-button-uuid-1'))
    expect(screen.getByTestId('delete-patient-dialog-cancel')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('delete-patient-dialog-cancel'))

    await waitFor(() => {
      expect(screen.queryByTestId('delete-patient-dialog-cancel')).not.toBeInTheDocument()
    })
  })

  it('closes dialog and keeps patient in list when deletion fails', async () => {
    ;(patientsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })
    ;(deletePatientUseCase as jest.Mock).mockRejectedValue(new Error('Server error'))

    renderWithProviders(<PatientList />)

    await waitFor(() => {
      expect(screen.getByTestId('patient-list-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('patient-delete-button-uuid-1'))
    await userEvent.click(screen.getByTestId('delete-patient-dialog-confirm'))

    await waitFor(() => {
      expect(screen.queryByTestId('delete-patient-dialog-confirm')).not.toBeInTheDocument()
    })

    expect(screen.getByTestId('patient-name-uuid-1')).toBeInTheDocument()
  })

  it('renders view and edit links for each patient', async () => {
    ;(patientsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<PatientList />)

    await waitFor(() => {
      expect(screen.getByTestId('patient-list-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('patient-view-link-uuid-1')).toBeInTheDocument()
    expect(screen.getByTestId('patient-edit-link-uuid-1')).toBeInTheDocument()
  })

  it('shows "busca" empty message when search yields no results', async () => {
    ;(patientsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<PatientList />)

    await userEvent.type(screen.getByTestId('patient-list-search'), 'xyz')

    await waitFor(() => {
      expect(screen.getByTestId('patient-list-empty')).toHaveTextContent(
        'Nenhum paciente encontrado para a busca realizada.',
      )
    })
  })

  it('shows singular count when exactly 1 patient is found', async () => {
    ;(patientsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<PatientList />)

    await waitFor(() => {
      expect(screen.getByText('1 paciente cadastrado')).toBeInTheDocument()
    })
  })

  it('renders a mobile card per patient with name, email and actions', async () => {
    ;(patientsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<PatientList />)

    await waitFor(() => expect(screen.getByTestId('patient-card-uuid-1')).toBeInTheDocument())

    expect(screen.getByTestId('patient-card-uuid-1-title')).toHaveTextContent('João Silva')
    expect(screen.getByTestId('patient-card-uuid-1-title')).toHaveTextContent('joao@example.com')
    expect(screen.getByTestId('patient-card-edit-link-uuid-1')).toBeInTheDocument()
    expect(screen.getByTestId('patient-card-view-link-uuid-1')).toBeInTheDocument()
  })

  it('clicking delete on a mobile card opens the delete dialog', async () => {
    ;(patientsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })

    renderWithProviders(<PatientList />)

    await waitFor(() => expect(screen.getByTestId('patient-card-delete-button-uuid-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('patient-card-delete-button-uuid-1'))

    expect(screen.getByTestId('delete-patient-dialog-confirm')).toBeInTheDocument()
  })

  // Criar, editar e excluir paciente são exclusivos do ADMIN
  // (patients.controller.ts:24,52,62). A recepcionista tem esta lista no menu
  // por desenho e via os três botões — cada clique terminava em 403.
  it('hides the create, edit and delete actions from a receptionist', async () => {
    ;(patientsService.getAll as jest.Mock).mockResolvedValue({ data: [makeDto()], total: 1, page: 1, limit: 20 })
    useAuthStore.setState({ user: makeUser(UserRole.USER) })

    renderWithProviders(<PatientList />)

    await waitFor(() => {
      expect(screen.getByTestId('patient-view-link-uuid-1')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('patient-list-new-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('patient-edit-link-uuid-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('patient-delete-button-uuid-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('patient-card-edit-link-uuid-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('patient-card-delete-button-uuid-1')).not.toBeInTheDocument()
  })
})