jest.mock('../services/schedule-exceptions.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserRole } from '@app/shared'
import { scheduleExceptionsService } from '../services/schedule-exceptions.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { BlockBanner } from './BlockBanner'
import type { IScheduleExceptionModel } from '../types/schedule-exception-model.types'

const mockService = scheduleExceptionsService as jest.Mocked<typeof scheduleExceptionsService>

const makeException = (overrides: Partial<IScheduleExceptionModel> = {}): IScheduleExceptionModel => ({
  id: 'exc-uuid',
  doctorId: 'doc-uuid',
  date: '2099-06-20',
  startTime: '14:00',
  endTime: '18:00',
  reason: 'Congresso',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('BlockBanner (integration)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('displays partial block window and reason', () => {
    renderWithProviders(<BlockBanner exception={makeException()} role={UserRole.ADMIN} />)

    expect(screen.getByTestId('block-banner-window')).toHaveTextContent('14:00 – 18:00 · Bloqueado')
    expect(screen.getByTestId('block-banner-reason')).toHaveTextContent('Congresso')
  })

  it('displays "Dia inteiro" when startTime and endTime are null', () => {
    renderWithProviders(
      <BlockBanner exception={makeException({ startTime: null, endTime: null })} role={UserRole.ADMIN} />,
    )

    expect(screen.getByTestId('block-banner-window')).toHaveTextContent('Dia inteiro · Bloqueado')
  })

  it('does not render reason when reason is null', () => {
    renderWithProviders(
      <BlockBanner exception={makeException({ reason: null })} role={UserRole.ADMIN} />,
    )

    expect(screen.queryByTestId('block-banner-reason')).not.toBeInTheDocument()
  })

  it('shows remove button for ADMIN', () => {
    renderWithProviders(<BlockBanner exception={makeException()} role={UserRole.ADMIN} />)
    expect(screen.getByTestId('block-banner-remove')).toBeInTheDocument()
  })

  it('shows remove button for DOCTOR', () => {
    renderWithProviders(<BlockBanner exception={makeException()} role={UserRole.DOCTOR} />)
    expect(screen.getByTestId('block-banner-remove')).toBeInTheDocument()
  })

  it('hides remove button for USER', () => {
    renderWithProviders(<BlockBanner exception={makeException()} role={UserRole.USER} />)
    expect(screen.queryByTestId('block-banner-remove')).not.toBeInTheDocument()
  })

  it('calls service remove when remove button is clicked', async () => {
    mockService.remove.mockResolvedValue(undefined)

    renderWithProviders(<BlockBanner exception={makeException()} role={UserRole.ADMIN} />)

    await userEvent.click(screen.getByTestId('block-banner-remove'))

    await waitFor(() => {
      expect(mockService.remove).toHaveBeenCalledWith('exc-uuid')
    })
  })
})
