import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { AtestadoForm } from './atestado-form'

const defaultProps = {
  appointmentId: 'appt-uuid',
  isPending: false,
  globalError: null,
  onSubmit: jest.fn(),
}

describe('AtestadoForm (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders both type tabs and submit button, defaulting to Afastamento', () => {
    renderWithProviders(<AtestadoForm {...defaultProps} />)
    expect(screen.getByTestId('atestado-form-type-leave')).toBeInTheDocument()
    expect(screen.getByTestId('atestado-form-type-attendance')).toBeInTheDocument()
    expect(screen.getByTestId('atestado-form-submit')).toBeInTheDocument()
    expect(screen.getByTestId('atestado-form-days-off')).toBeInTheDocument()
    expect(screen.getByTestId('atestado-form-start-date')).toBeInTheDocument()
  })

  it('switches to comparecimento fields when clicking Comparecimento tab', async () => {
    renderWithProviders(<AtestadoForm {...defaultProps} />)
    await userEvent.click(screen.getByTestId('atestado-form-type-attendance'))
    expect(screen.getByTestId('atestado-form-attendance-date')).toBeInTheDocument()
    expect(screen.getByTestId('atestado-form-check-in-time')).toBeInTheDocument()
    expect(screen.getByTestId('atestado-form-check-out-time')).toBeInTheDocument()
    expect(screen.queryByTestId('atestado-form-days-off')).not.toBeInTheDocument()
  })

  it('switches back to afastamento fields when clicking Afastamento tab', async () => {
    renderWithProviders(<AtestadoForm {...defaultProps} />)
    await userEvent.click(screen.getByTestId('atestado-form-type-attendance'))
    await userEvent.click(screen.getByTestId('atestado-form-type-leave'))
    expect(screen.getByTestId('atestado-form-days-off')).toBeInTheDocument()
    expect(screen.queryByTestId('atestado-form-attendance-date')).not.toBeInTheDocument()
  })

  it('shows validation errors for LEAVE when submitting empty form', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<AtestadoForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.click(screen.getByTestId('atestado-form-submit'))

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with correct payload for LEAVE', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<AtestadoForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('atestado-form-days-off'), '3')
    await userEvent.type(screen.getByTestId('atestado-form-start-date'), '2026-01-05')
    await userEvent.type(screen.getByTestId('atestado-form-cid-code'), 'M54.5')
    await userEvent.click(screen.getByTestId('atestado-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      appointmentId: 'appt-uuid',
      type: 'leave',
      daysOff: 3,
      startDate: '2026-01-05',
      cidCode: 'M54.5',
    })
  })

  it('shows validation errors for ATTENDANCE when submitting empty required fields', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<AtestadoForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.click(screen.getByTestId('atestado-form-type-attendance'))
    await userEvent.click(screen.getByTestId('atestado-form-submit'))

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with correct payload for ATTENDANCE', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<AtestadoForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.click(screen.getByTestId('atestado-form-type-attendance'))
    await userEvent.type(screen.getByTestId('atestado-form-attendance-date'), '2026-01-05')
    await userEvent.type(screen.getByTestId('atestado-form-check-in-time'), '08:00')
    await userEvent.type(screen.getByTestId('atestado-form-check-out-time'), '08:30')
    await userEvent.click(screen.getByTestId('atestado-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      appointmentId: 'appt-uuid',
      type: 'attendance',
      attendanceDate: '2026-01-05',
      checkInTime: '08:00',
      checkOutTime: '08:30',
    })
  })

  it('includes observations in payload when filled', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<AtestadoForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('atestado-form-days-off'), '2')
    await userEvent.type(screen.getByTestId('atestado-form-start-date'), '2026-01-05')
    await userEvent.type(screen.getByTestId('atestado-form-observations'), 'Repouso absoluto.')
    await userEvent.click(screen.getByTestId('atestado-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0].observations).toBe('Repouso absoluto.')
  })

  it('disables submit button when isPending', () => {
    renderWithProviders(<AtestadoForm {...defaultProps} isPending />)
    expect(screen.getByTestId('atestado-form-submit')).toBeDisabled()
  })

  it('shows globalError alert', () => {
    renderWithProviders(<AtestadoForm {...defaultProps} globalError="Consulta cancelada." />)
    expect(screen.getByTestId('atestado-form-error')).toHaveTextContent('Consulta cancelada.')
  })
})
