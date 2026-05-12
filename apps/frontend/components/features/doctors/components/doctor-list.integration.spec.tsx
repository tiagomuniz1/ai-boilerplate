jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/doctors.service')
jest.mock('../use-cases/delete-doctor.use-case')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { doctorsService } from '../services/doctors.service'
import { deleteDoctorUseCase } from '../use-cases/delete-doctor.use-case'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { DoctorList } from './doctor-list'

const mockPush = jest.fn()

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@example.com' },
  crmNumber: '12345/SP',
  specialty: 'Cardiologia',
  bio: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-16T10:00:00.000Z',
  ...overrides,
})

describe('DoctorList (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
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
    expect(screen.getByTestId('doctor-specialty-uuid-1')).toHaveTextContent('Cardiologia')
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

  it('renders "Novo médico" button', async () => {
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    renderWithProviders(<DoctorList />)

    expect(screen.getByTestId('doctor-list-new-button')).toBeInTheDocument()
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
})
