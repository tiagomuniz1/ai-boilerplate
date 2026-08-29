jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { DayOfWeek } from '@app/shared'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ScheduleDetails } from './schedule-details'
import type { IScheduleModel } from '../types/schedule-model.types'

beforeEach(() => {
  ;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })
})

const makeSchedule = (overrides: Partial<IScheduleModel> = {}): IScheduleModel => ({
  id: 'uuid-1',
  professionalId: 'doc-uuid-1',
  professionalName: 'Dr. Test',
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
  validFrom: null,
  validUntil: null,
  createdAt: new Date('2025-01-15T10:00:00.000Z'),
  updatedAt: new Date('2025-01-16T10:00:00.000Z'),
  ...overrides,
})

describe('ScheduleDetails', () => {
  it('renders day of week label', () => {
    renderWithProviders(<ScheduleDetails schedule={makeSchedule()} canManageSchedules={true} onDeleteClick={jest.fn()} />)
    expect(screen.getByTestId('schedule-details-day')).toHaveTextContent('Segunda-feira')
  })

  it('renders time range', () => {
    renderWithProviders(<ScheduleDetails schedule={makeSchedule()} canManageSchedules={true} onDeleteClick={jest.fn()} />)
    expect(screen.getByTestId('schedule-details-time-range')).toHaveTextContent('08:00 – 12:00')
  })

  it('renders slot duration', () => {
    renderWithProviders(<ScheduleDetails schedule={makeSchedule()} canManageSchedules={true} onDeleteClick={jest.fn()} />)
    expect(screen.getByTestId('schedule-details-slot')).toHaveTextContent('30 minutos')
  })

  it('renders "Indefinido" when validFrom is null', () => {
    renderWithProviders(
      <ScheduleDetails schedule={makeSchedule({ validFrom: null })} canManageSchedules={true} onDeleteClick={jest.fn()} />,
    )
    expect(screen.getByTestId('schedule-details-valid-from')).toHaveTextContent('Indefinido')
  })

  it('renders validFrom and validUntil when set', () => {
    renderWithProviders(
      <ScheduleDetails
        schedule={makeSchedule({ validFrom: '2025-03-01', validUntil: '2025-12-31' })}
        canManageSchedules={true}
        onDeleteClick={jest.fn()}
      />,
    )
    expect(screen.getByTestId('schedule-details-valid-from')).toHaveTextContent('2025-03-01')
    expect(screen.getByTestId('schedule-details-valid-until')).toHaveTextContent('2025-12-31')
  })

  it('renders edit and delete buttons when canManageSchedules is true', () => {
    renderWithProviders(<ScheduleDetails schedule={makeSchedule()} canManageSchedules={true} onDeleteClick={jest.fn()} />)
    expect(screen.getByTestId('schedule-details-edit-button')).toBeInTheDocument()
    expect(screen.getByTestId('schedule-details-delete-button')).toBeInTheDocument()
  })

  it('hides edit and delete buttons when canManageSchedules is false', () => {
    renderWithProviders(<ScheduleDetails schedule={makeSchedule()} canManageSchedules={false} onDeleteClick={jest.fn()} />)
    expect(screen.queryByTestId('schedule-details-edit-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('schedule-details-delete-button')).not.toBeInTheDocument()
  })

  it('calls onDeleteClick when delete button is clicked', async () => {
    const onDeleteClick = jest.fn()
    renderWithProviders(<ScheduleDetails schedule={makeSchedule()} canManageSchedules={true} onDeleteClick={onDeleteClick} />)
    await userEvent.click(screen.getByTestId('schedule-details-delete-button'))
    expect(onDeleteClick).toHaveBeenCalledTimes(1)
  })

  it('renders created at date', () => {
    renderWithProviders(<ScheduleDetails schedule={makeSchedule()} canManageSchedules={true} onDeleteClick={jest.fn()} />)
    expect(screen.getByTestId('schedule-details-created-at')).toBeInTheDocument()
  })
})
