jest.mock('../services/schedule-exceptions.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserRole } from '@app/shared'
import { scheduleExceptionsService } from '../services/schedule-exceptions.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { BlockTimeDialog } from './BlockTimeDialog'

const mockService = scheduleExceptionsService as jest.Mocked<typeof scheduleExceptionsService>

const makeExceptionResponse = (overrides = {}) => ({
  id: 'exc-uuid',
  professionalId: 'doc-uuid',
  date: '2099-06-20',
  startTime: '08:00',
  endTime: '12:00',
  reason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  date: '2099-06-20',
  role: UserRole.PROFESSIONAL,
}

describe('BlockTimeDialog (integration)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders dialog when open', () => {
    renderWithProviders(<BlockTimeDialog {...defaultProps} />)
    expect(screen.getByTestId('block-time-dialog')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    renderWithProviders(<BlockTimeDialog {...defaultProps} isOpen={false} />)
    expect(screen.queryByTestId('block-time-dialog')).not.toBeInTheDocument()
  })

  it('renders date, start time, end time, reason fields', () => {
    renderWithProviders(<BlockTimeDialog {...defaultProps} />)
    expect(screen.getByTestId('block-dialog-date')).toBeInTheDocument()
    expect(screen.getByTestId('block-dialog-start-time')).toBeInTheDocument()
    expect(screen.getByTestId('block-dialog-end-time')).toBeInTheDocument()
    expect(screen.getByTestId('block-dialog-reason')).toBeInTheDocument()
    expect(screen.getByTestId('block-dialog-all-day')).toBeInTheDocument()
  })

  it('disables startTime and endTime when "Dia inteiro" is checked', async () => {
    renderWithProviders(<BlockTimeDialog {...defaultProps} />)

    await userEvent.click(screen.getByTestId('block-dialog-all-day'))

    expect(screen.getByTestId('block-dialog-start-time')).toBeDisabled()
    expect(screen.getByTestId('block-dialog-end-time')).toBeDisabled()
  })

  it('enables startTime and endTime when "Dia inteiro" is unchecked', async () => {
    renderWithProviders(<BlockTimeDialog {...defaultProps} />)

    await userEvent.click(screen.getByTestId('block-dialog-all-day'))
    await userEvent.click(screen.getByTestId('block-dialog-all-day'))

    expect(screen.getByTestId('block-dialog-start-time')).not.toBeDisabled()
    expect(screen.getByTestId('block-dialog-end-time')).not.toBeDisabled()
  })

  it('shows validation error when startTime >= endTime', async () => {
    renderWithProviders(<BlockTimeDialog {...defaultProps} />)

    await userEvent.type(screen.getByTestId('block-dialog-start-time'), '12:00')
    await userEvent.type(screen.getByTestId('block-dialog-end-time'), '08:00')
    await userEvent.click(screen.getByTestId('block-dialog-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('block-dialog-end-time-error')).toBeInTheDocument()
    })
  })

  it('shows validation error when startTime is missing (not all-day)', async () => {
    renderWithProviders(<BlockTimeDialog {...defaultProps} />)

    await userEvent.click(screen.getByTestId('block-dialog-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('block-dialog-start-time-error')).toBeInTheDocument()
    })
  })

  it('submits with null startTime/endTime when all-day is checked', async () => {
    mockService.create.mockResolvedValue(makeExceptionResponse({ startTime: null, endTime: null }))

    renderWithProviders(<BlockTimeDialog {...defaultProps} />)

    await userEvent.click(screen.getByTestId('block-dialog-all-day'))
    await userEvent.click(screen.getByTestId('block-dialog-submit'))

    await waitFor(() => {
      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining({ startTime: null, endTime: null }),
      )
    })
  })

  it('calls service with correct payload for partial block (DOCTOR)', async () => {
    mockService.create.mockResolvedValue(makeExceptionResponse())

    renderWithProviders(<BlockTimeDialog {...defaultProps} role={UserRole.PROFESSIONAL} />)

    await userEvent.type(screen.getByTestId('block-dialog-start-time'), '08:00')
    await userEvent.type(screen.getByTestId('block-dialog-end-time'), '12:00')
    await userEvent.click(screen.getByTestId('block-dialog-submit'))

    await waitFor(() => {
      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          date: '2099-06-20',
          startTime: '08:00',
          endTime: '12:00',
        }),
      )
    })

    const callArg = mockService.create.mock.calls[0][0]
    expect(callArg.professionalId).toBeUndefined()
  })

  it('includes professionalId in payload for ADMIN', async () => {
    mockService.create.mockResolvedValue(makeExceptionResponse())

    renderWithProviders(
      <BlockTimeDialog {...defaultProps} role={UserRole.ADMIN} professionalId="doc-uuid" />,
    )

    await userEvent.click(screen.getByTestId('block-dialog-all-day'))
    await userEvent.click(screen.getByTestId('block-dialog-submit'))

    await waitFor(() => {
      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining({ professionalId: 'doc-uuid' }),
      )
    })
  })

  it('closes dialog on success', async () => {
    mockService.create.mockResolvedValue(makeExceptionResponse())
    const onClose = jest.fn()

    renderWithProviders(<BlockTimeDialog {...defaultProps} onClose={onClose} />)

    await userEvent.click(screen.getByTestId('block-dialog-all-day'))
    await userEvent.click(screen.getByTestId('block-dialog-submit'))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('keeps dialog open and shows conflict alert on 409 error', async () => {
    const conflictDetail = 'Existe consulta agendada no período (09:00, 10:00).'
    mockService.create.mockRejectedValue({
      status: 409,
      title: 'Conflict',
      detail: conflictDetail,
    })
    const onClose = jest.fn()

    renderWithProviders(<BlockTimeDialog {...defaultProps} onClose={onClose} />)

    await userEvent.click(screen.getByTestId('block-dialog-all-day'))
    await userEvent.click(screen.getByTestId('block-dialog-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('block-dialog-conflict-error')).toBeInTheDocument()
    })

    expect(screen.getByTestId('block-dialog-conflict-error')).toHaveTextContent(conflictDetail)
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByTestId('block-time-dialog')).toBeInTheDocument()
  })

  it('shows fallback message when 409 has no detail', async () => {
    mockService.create.mockRejectedValue({ status: 409, title: 'Conflict' })

    renderWithProviders(<BlockTimeDialog {...defaultProps} />)

    await userEvent.click(screen.getByTestId('block-dialog-all-day'))
    await userEvent.click(screen.getByTestId('block-dialog-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('block-dialog-conflict-error')).toBeInTheDocument()
    })

    expect(screen.getByTestId('block-dialog-conflict-error')).toHaveTextContent('Remarque ou cancele')
  })

  it('shows generic error alert on non-409 error', async () => {
    mockService.create.mockRejectedValue({ status: 500, title: 'Internal Server Error' })

    renderWithProviders(<BlockTimeDialog {...defaultProps} />)

    await userEvent.click(screen.getByTestId('block-dialog-all-day'))
    await userEvent.click(screen.getByTestId('block-dialog-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('block-dialog-error')).toBeInTheDocument()
    })
  })

  it('sets field errors when 422 error includes field-level errors', async () => {
    mockService.create.mockRejectedValue({
      status: 422,
      title: 'Unprocessable Entity',
      errors: [{ field: 'startTime', message: 'Horário inválido' }],
    })

    renderWithProviders(<BlockTimeDialog {...defaultProps} />)

    await userEvent.type(screen.getByTestId('block-dialog-start-time'), '08:00')
    await userEvent.type(screen.getByTestId('block-dialog-end-time'), '12:00')
    await userEvent.click(screen.getByTestId('block-dialog-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('block-dialog-start-time-error')).toHaveTextContent('Horário inválido')
    })
  })
})
