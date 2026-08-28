import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppointmentCancellationScope } from '@app/shared'
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

    expect(defaultProps.onConfirm).toHaveBeenCalledWith({
      cancellationReason: 'Paciente desmarcou',
      scope: AppointmentCancellationScope.SINGLE_OCCURRENCE,
    })
  })

  it('calls onConfirm with undefined when reason is empty', async () => {
    renderWithProviders(<CancelAppointmentDialog {...defaultProps} />)

    await userEvent.click(screen.getByTestId('cancel-dialog-confirm'))

    expect(defaultProps.onConfirm).toHaveBeenCalledWith({
      cancellationReason: undefined,
      scope: AppointmentCancellationScope.SINGLE_OCCURRENCE,
    })
  })

  it('calls onClose when back button is clicked', async () => {
    renderWithProviders(<CancelAppointmentDialog {...defaultProps} />)

    await userEvent.click(screen.getByTestId('cancel-dialog-cancel'))

    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  describe('cancellation scope', () => {
    const seriesProps = { ...defaultProps, seriesId: 'series-uuid', seriesFutureCount: 5 }

    it('does not offer a scope choice for a standalone appointment', () => {
      renderWithProviders(<CancelAppointmentDialog {...defaultProps} />)

      expect(screen.queryByTestId('cancel-dialog-scope')).not.toBeInTheDocument()
    })

    it('does not offer a scope choice on the last occurrence of a series', () => {
      renderWithProviders(
        <CancelAppointmentDialog {...defaultProps} seriesId="series-uuid" seriesFutureCount={0} />,
      )

      expect(screen.queryByTestId('cancel-dialog-scope')).not.toBeInTheDocument()
    })

    it('offers the scope choice with the single occurrence preselected', () => {
      renderWithProviders(<CancelAppointmentDialog {...seriesProps} />)

      expect(screen.getByTestId('cancel-dialog-scope')).toBeInTheDocument()
      expect(screen.getByTestId('cancel-dialog-scope-occurrence')).toBeChecked()
      expect(screen.getByTestId('cancel-dialog-scope-series')).not.toBeChecked()
      expect(screen.getByTestId('cancel-dialog-confirm')).toHaveTextContent('Cancelar consulta')
    })

    it('counts the affected occurrences when the series scope is chosen', async () => {
      renderWithProviders(<CancelAppointmentDialog {...seriesProps} />)

      await userEvent.click(screen.getByTestId('cancel-dialog-scope-series'))

      expect(screen.getByTestId('cancel-dialog-scope-summary')).toHaveTextContent(
        'Serão canceladas 6 consultas',
      )
      expect(screen.getByTestId('cancel-dialog-confirm')).toHaveTextContent('Cancelar 6 consultas')
    })

    it('submits the series scope', async () => {
      renderWithProviders(<CancelAppointmentDialog {...seriesProps} />)

      await userEvent.click(screen.getByTestId('cancel-dialog-scope-series'))
      await userEvent.click(screen.getByTestId('cancel-dialog-confirm'))

      expect(seriesProps.onConfirm).toHaveBeenCalledWith({
        cancellationReason: undefined,
        scope: AppointmentCancellationScope.THIS_AND_FUTURE_OCCURRENCES,
      })
    })

    it('resets the chosen scope when the dialog closes and reopens', async () => {
      const { rerender } = renderWithProviders(<CancelAppointmentDialog {...seriesProps} />)

      await userEvent.click(screen.getByTestId('cancel-dialog-scope-series'))
      expect(screen.getByTestId('cancel-dialog-scope-series')).toBeChecked()

      rerender(<CancelAppointmentDialog {...seriesProps} isOpen={false} />)
      rerender(<CancelAppointmentDialog {...seriesProps} isOpen />)

      expect(screen.getByTestId('cancel-dialog-scope-occurrence')).toBeChecked()
    })
  })
})
