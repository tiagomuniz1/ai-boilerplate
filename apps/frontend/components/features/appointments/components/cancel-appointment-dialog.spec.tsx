import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { CancelAppointmentDialog } from './cancel-appointment-dialog'

const defaultProps = {
  isOpen: true,
  isPending: false,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
}

describe('CancelAppointmentDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders dialog when open', () => {
    renderWithProviders(<CancelAppointmentDialog {...defaultProps} />)
    expect(screen.getByTestId('cancel-appointment-dialog')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    renderWithProviders(<CancelAppointmentDialog {...defaultProps} isOpen={false} />)
    expect(screen.queryByTestId('cancel-appointment-dialog')).not.toBeInTheDocument()
  })

  it('calls onConfirm with reason string when reason is provided', async () => {
    renderWithProviders(<CancelAppointmentDialog {...defaultProps} />)

    await userEvent.type(screen.getByTestId('cancel-reason-input'), 'Paciente desmarcou')
    await userEvent.click(screen.getByTestId('cancel-dialog-confirm'))

    expect(defaultProps.onConfirm).toHaveBeenCalledWith('Paciente desmarcou')
  })

  it('calls onConfirm with undefined when reason is empty', async () => {
    renderWithProviders(<CancelAppointmentDialog {...defaultProps} />)

    await userEvent.click(screen.getByTestId('cancel-dialog-confirm'))

    expect(defaultProps.onConfirm).toHaveBeenCalledWith(undefined)
  })

  it('calls onClose when back button is clicked', async () => {
    renderWithProviders(<CancelAppointmentDialog {...defaultProps} />)

    await userEvent.click(screen.getByTestId('cancel-dialog-cancel'))

    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})
