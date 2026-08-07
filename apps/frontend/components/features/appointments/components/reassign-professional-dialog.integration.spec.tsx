jest.mock('../use-cases/get-reassign-candidates.use-case')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { getReassignCandidatesUseCase } from '../use-cases/get-reassign-candidates.use-case'
import { ReassignProfessionalDialog } from './reassign-professional-dialog'

const mockUseCase = getReassignCandidatesUseCase as jest.Mock

const defaultProps = {
  isOpen: true,
  appointmentId: 'apt-1',
  isPending: false,
  errorMessage: null as string | null,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
}

const candidates = [
  { professionalId: 'd1', professionalName: 'Dr. Ana', specialtyName: 'Cardiologia' },
  { professionalId: 'd2', professionalName: 'Dr. Beto', specialtyName: null },
]

describe('ReassignProfessionalDialog', () => {
  beforeEach(() => jest.clearAllMocks())

  it('does not render when closed', () => {
    mockUseCase.mockResolvedValue(candidates)
    renderWithProviders(<ReassignProfessionalDialog {...defaultProps} isOpen={false} />)
    expect(screen.queryByTestId('reassign-professional-dialog')).not.toBeInTheDocument()
  })

  it('shows the loading state while fetching candidates', () => {
    mockUseCase.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<ReassignProfessionalDialog {...defaultProps} />)
    expect(screen.getByTestId('reassign-loading')).toBeInTheDocument()
  })

  it('shows the error state when the fetch fails', async () => {
    mockUseCase.mockRejectedValue({ status: 500 })
    renderWithProviders(<ReassignProfessionalDialog {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('reassign-error')).toBeInTheDocument())
  })

  it('shows the empty state when there are no candidates', async () => {
    mockUseCase.mockResolvedValue([])
    renderWithProviders(<ReassignProfessionalDialog {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('reassign-empty')).toBeInTheDocument())
  })

  it('renders candidate options and confirms the selected professional', async () => {
    mockUseCase.mockResolvedValue(candidates)
    const onConfirm = jest.fn()
    renderWithProviders(<ReassignProfessionalDialog {...defaultProps} onConfirm={onConfirm} />)

    await waitFor(() => expect(screen.getByTestId('reassign-professional-select')).toBeInTheDocument())

    // Confirm is disabled until a professional is chosen.
    expect(screen.getByTestId('reassign-dialog-confirm')).toBeDisabled()

    await userEvent.selectOptions(screen.getByTestId('reassign-professional-select'), 'd2')
    await userEvent.click(screen.getByTestId('reassign-dialog-confirm'))

    expect(onConfirm).toHaveBeenCalledWith('d2')
  })

  it('renders the submit error message when provided', async () => {
    mockUseCase.mockResolvedValue(candidates)
    renderWithProviders(
      <ReassignProfessionalDialog {...defaultProps} errorMessage="Profissional indisponível." />,
    )
    await waitFor(() => expect(screen.getByTestId('reassign-submit-error')).toHaveTextContent('Profissional indisponível.'))
  })

  it('calls onClose when the back button is clicked', async () => {
    mockUseCase.mockResolvedValue(candidates)
    const onClose = jest.fn()
    renderWithProviders(<ReassignProfessionalDialog {...defaultProps} onClose={onClose} />)
    await userEvent.click(screen.getByTestId('reassign-dialog-cancel'))
    expect(onClose).toHaveBeenCalled()
  })
})
