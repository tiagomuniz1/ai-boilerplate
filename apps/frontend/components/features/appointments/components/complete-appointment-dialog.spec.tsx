import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { CompleteAppointmentDialog } from './complete-appointment-dialog'

const defaultProps = {
  isOpen: true,
  isPending: false,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
}

describe('CompleteAppointmentDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders dialog when open', () => {
    renderWithProviders(<CompleteAppointmentDialog {...defaultProps} />)
    expect(screen.getByTestId('complete-appointment-dialog')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    renderWithProviders(<CompleteAppointmentDialog {...defaultProps} isOpen={false} />)
    expect(screen.queryByTestId('complete-appointment-dialog')).not.toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', async () => {
    renderWithProviders(<CompleteAppointmentDialog {...defaultProps} />)

    await userEvent.click(screen.getByTestId('complete-dialog-confirm'))

    expect(defaultProps.onConfirm).toHaveBeenCalled()
  })

  it('calls onClose when back button is clicked', async () => {
    renderWithProviders(<CompleteAppointmentDialog {...defaultProps} />)

    await userEvent.click(screen.getByTestId('complete-dialog-cancel'))

    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('disables the back button and shows loading state on confirm while pending', () => {
    renderWithProviders(<CompleteAppointmentDialog {...defaultProps} isPending={true} />)

    expect(screen.getByTestId('complete-dialog-cancel')).toBeDisabled()
    expect(screen.getByTestId('complete-dialog-confirm')).toHaveAttribute('aria-busy', 'true')
  })
})
