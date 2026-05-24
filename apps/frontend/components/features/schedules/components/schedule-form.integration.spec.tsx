jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { UserRole, DayOfWeek } from '@app/shared'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ScheduleForm } from './schedule-form'
import type { IScheduleModel } from '../types/schedule-model.types'

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })
})

const mockDoctors = [
  { id: 'doc-uuid-1', user: { fullName: 'Dr. João Silva' } },
  { id: 'doc-uuid-2', user: { fullName: 'Dra. Ana Costa' } },
]

const mockDefaultValues: IScheduleModel = {
  id: 'uuid-1',
  doctorId: 'doc-uuid-1',
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
  validFrom: null,
  validUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('ScheduleForm — create mode', () => {
  it('renders doctor select for ADMIN', () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <ScheduleForm
        mode="create"
        role={UserRole.ADMIN}
        doctors={mockDoctors}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByTestId('schedule-form-doctor')).toBeInTheDocument()
  })

  it('does not render doctor select for DOCTOR', () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <ScheduleForm
        mode="create"
        role={UserRole.DOCTOR}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.queryByTestId('schedule-form-doctor')).not.toBeInTheDocument()
  })

  it('renders all required fields', () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <ScheduleForm
        mode="create"
        role={UserRole.DOCTOR}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByTestId('schedule-form-day')).toBeInTheDocument()
    expect(screen.getByTestId('schedule-form-start-time')).toBeInTheDocument()
    expect(screen.getByTestId('schedule-form-end-time')).toBeInTheDocument()
    expect(screen.getByTestId('schedule-form-slot')).toBeInTheDocument()
  })

  it('shows global error alert when globalError is provided', () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <ScheduleForm
        mode="create"
        role={UserRole.DOCTOR}
        isPending={false}
        globalError="Esta agenda conflita com outra já existente"
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByTestId('schedule-form-error')).toHaveTextContent(
      'Esta agenda conflita com outra já existente',
    )
  })

  it('shows validation error when endTime is before startTime', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <ScheduleForm
        mode="create"
        role={UserRole.DOCTOR}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.selectOptions(screen.getByTestId('schedule-form-day'), 'MONDAY')
    await userEvent.clear(screen.getByTestId('schedule-form-start-time'))
    await userEvent.type(screen.getByTestId('schedule-form-start-time'), '12:00')
    await userEvent.clear(screen.getByTestId('schedule-form-end-time'))
    await userEvent.type(screen.getByTestId('schedule-form-end-time'), '08:00')

    await userEvent.click(screen.getByTestId('schedule-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Horário de fim deve ser após o início')).toBeInTheDocument()
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('disables submit button while pending', () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <ScheduleForm
        mode="create"
        role={UserRole.DOCTOR}
        isPending={true}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByTestId('schedule-form-submit')).toBeDisabled()
  })
})

describe('ScheduleForm — edit mode', () => {
  it('populates fields with defaultValues', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <ScheduleForm
        mode="edit"
        defaultValues={mockDefaultValues}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    await waitFor(() => {
      expect((screen.getByTestId('schedule-form-day') as HTMLSelectElement).value).toBe('MONDAY')
      expect((screen.getByTestId('schedule-form-start-time') as HTMLInputElement).value).toBe('08:00')
      expect((screen.getByTestId('schedule-form-end-time') as HTMLInputElement).value).toBe('12:00')
    })
  })

  it('shows global error alert when provided', () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <ScheduleForm
        mode="edit"
        defaultValues={mockDefaultValues}
        isPending={false}
        globalError="Esta agenda conflita com outra já existente"
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByTestId('schedule-form-error')).toHaveTextContent(
      'Esta agenda conflita com outra já existente',
    )
  })

  it('disables submit button while pending', () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <ScheduleForm
        mode="edit"
        defaultValues={mockDefaultValues}
        isPending={true}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByTestId('schedule-form-submit')).toBeDisabled()
  })
})
