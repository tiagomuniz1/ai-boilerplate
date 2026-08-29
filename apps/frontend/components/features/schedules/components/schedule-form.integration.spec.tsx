jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))

import { screen, waitFor, fireEvent } from '@testing-library/react'
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

const DOC_UUID_1 = '00000000-0000-4000-a000-000000000001'
const DOC_UUID_2 = '00000000-0000-4000-a000-000000000002'

const mockDoctors = [
  { id: DOC_UUID_1, user: { fullName: 'Dr. João Silva' } },
  { id: DOC_UUID_2, user: { fullName: 'Dra. Ana Costa' } },
]

const mockDefaultValues: IScheduleModel = {
  id: 'uuid-1',
  professionalId: 'doc-uuid-1',
  professionalName: 'Dr. Test',
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

    expect(screen.getByTestId('schedule-form-professional')).toBeInTheDocument()
  })

  it('does not render doctor select for DOCTOR', () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <ScheduleForm
        mode="create"
        role={UserRole.PROFESSIONAL}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.queryByTestId('schedule-form-professional')).not.toBeInTheDocument()
  })

  it('renders all required fields', () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <ScheduleForm
        mode="create"
        role={UserRole.PROFESSIONAL}
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
        role={UserRole.PROFESSIONAL}
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
        role={UserRole.PROFESSIONAL}
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

  it('shows validation errors for empty required fields in DOCTOR mode', async () => {
    renderWithProviders(
      <ScheduleForm mode="create" role={UserRole.PROFESSIONAL} isPending={false} onSubmit={jest.fn()} />,
    )

    await userEvent.click(screen.getByTestId('schedule-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('schedule-form-day')).toHaveAttribute('aria-invalid', 'true')
    })

    expect(screen.getByTestId('schedule-form-start-time')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByTestId('schedule-form-end-time')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows validation error when no doctor is selected in ADMIN mode', async () => {
    renderWithProviders(
      <ScheduleForm
        mode="create"
        role={UserRole.ADMIN}
        doctors={mockDoctors}
        isPending={false}
        onSubmit={jest.fn()}
      />,
    )

    await userEvent.click(screen.getByTestId('schedule-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Selecione um profissional')).toBeInTheDocument()
    })
  })

  it('calls onSubmit for DOCTOR without professionalId on valid submit', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <ScheduleForm mode="create" role={UserRole.PROFESSIONAL} isPending={false} onSubmit={onSubmit} />,
    )

    await userEvent.selectOptions(screen.getByTestId('schedule-form-day'), 'MONDAY')
    await userEvent.clear(screen.getByTestId('schedule-form-start-time'))
    await userEvent.type(screen.getByTestId('schedule-form-start-time'), '08:00')
    await userEvent.clear(screen.getByTestId('schedule-form-end-time'))
    await userEvent.type(screen.getByTestId('schedule-form-end-time'), '12:00')

    await userEvent.click(screen.getByTestId('schedule-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          dayOfWeek: 'MONDAY',
          startTime: '08:00',
          endTime: '12:00',
          slotDurationInMinutes: 30,
        }),
        expect.any(Function),
      )
    })

    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('professionalId')
  })

  it('shows error when slot duration does not evenly divide the time interval', async () => {
    renderWithProviders(
      <ScheduleForm mode="create" role={UserRole.PROFESSIONAL} isPending={false} onSubmit={jest.fn()} />,
    )

    await userEvent.selectOptions(screen.getByTestId('schedule-form-day'), 'MONDAY')
    await userEvent.clear(screen.getByTestId('schedule-form-start-time'))
    await userEvent.type(screen.getByTestId('schedule-form-start-time'), '08:00')
    await userEvent.clear(screen.getByTestId('schedule-form-end-time'))
    await userEvent.type(screen.getByTestId('schedule-form-end-time'), '12:00')

    await userEvent.clear(screen.getByTestId('schedule-form-slot'))
    await userEvent.type(screen.getByTestId('schedule-form-slot'), '17')

    await userEvent.click(screen.getByTestId('schedule-form-submit'))

    await waitFor(() => {
      expect(
        screen.getByText('O intervalo de tempo deve ser divisível pela duração do slot'),
      ).toBeInTheDocument()
    })
  })

  it('calls onSubmit for ADMIN with professionalId on valid submit', async () => {
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

    await userEvent.selectOptions(screen.getByTestId('schedule-form-professional'), DOC_UUID_1)
    await userEvent.selectOptions(screen.getByTestId('schedule-form-day'), 'MONDAY')
    await userEvent.clear(screen.getByTestId('schedule-form-start-time'))
    await userEvent.type(screen.getByTestId('schedule-form-start-time'), '08:00')
    await userEvent.clear(screen.getByTestId('schedule-form-end-time'))
    await userEvent.type(screen.getByTestId('schedule-form-end-time'), '12:00')
    await userEvent.clear(screen.getByTestId('schedule-form-slot'))
    await userEvent.type(screen.getByTestId('schedule-form-slot'), '30')

    await userEvent.click(screen.getByTestId('schedule-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          professionalId: DOC_UUID_1,
          dayOfWeek: 'MONDAY',
          startTime: '08:00',
          endTime: '12:00',
          slotDurationInMinutes: 30,
        }),
        expect.any(Function),
      )
    })
  })

  it('includes validFrom and validUntil in submit payload when set', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <ScheduleForm mode="create" role={UserRole.PROFESSIONAL} isPending={false} onSubmit={onSubmit} />,
    )

    await userEvent.selectOptions(screen.getByTestId('schedule-form-day'), 'TUESDAY')
    await userEvent.clear(screen.getByTestId('schedule-form-start-time'))
    await userEvent.type(screen.getByTestId('schedule-form-start-time'), '09:00')
    await userEvent.clear(screen.getByTestId('schedule-form-end-time'))
    await userEvent.type(screen.getByTestId('schedule-form-end-time'), '12:00')
    fireEvent.change(screen.getByTestId('schedule-form-valid-from'), { target: { value: '2025-01-01' } })
    fireEvent.change(screen.getByTestId('schedule-form-valid-until'), { target: { value: '2025-12-31' } })

    await userEvent.click(screen.getByTestId('schedule-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ validFrom: '2025-01-01', validUntil: '2025-12-31' }),
        expect.any(Function),
      )
    })
  })

  it('shows error when validUntil is before validFrom', async () => {
    renderWithProviders(
      <ScheduleForm mode="create" role={UserRole.PROFESSIONAL} isPending={false} onSubmit={jest.fn()} />,
    )

    await userEvent.selectOptions(screen.getByTestId('schedule-form-day'), 'MONDAY')
    await userEvent.clear(screen.getByTestId('schedule-form-start-time'))
    await userEvent.type(screen.getByTestId('schedule-form-start-time'), '08:00')
    await userEvent.clear(screen.getByTestId('schedule-form-end-time'))
    await userEvent.type(screen.getByTestId('schedule-form-end-time'), '12:00')

    fireEvent.change(screen.getByTestId('schedule-form-valid-from'), { target: { value: '2025-12-01' } })
    fireEvent.change(screen.getByTestId('schedule-form-valid-until'), { target: { value: '2025-11-01' } })

    await userEvent.click(screen.getByTestId('schedule-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Data final deve ser após a data inicial')).toBeInTheDocument()
    })
  })


  it('disables submit button while pending', () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <ScheduleForm
        mode="create"
        role={UserRole.PROFESSIONAL}
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

  it('shows validation error when endTime is cleared in edit mode', async () => {
    renderWithProviders(
      <ScheduleForm mode="edit" defaultValues={mockDefaultValues} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect((screen.getByTestId('schedule-form-end-time') as HTMLInputElement).value).toBe('12:00')
    })

    await userEvent.clear(screen.getByTestId('schedule-form-end-time'))
    await userEvent.click(screen.getByTestId('schedule-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('schedule-form-end-time')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  it('shows validation error when slot duration is too small in edit mode', async () => {
    renderWithProviders(
      <ScheduleForm mode="edit" defaultValues={mockDefaultValues} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect((screen.getByTestId('schedule-form-day') as HTMLSelectElement).value).toBe('MONDAY')
    })

    await userEvent.clear(screen.getByTestId('schedule-form-slot'))
    await userEvent.type(screen.getByTestId('schedule-form-slot'), '5')
    await userEvent.click(screen.getByTestId('schedule-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Mínimo 15 minutos')).toBeInTheDocument()
    })
  })

  it('shows error when validUntil is before validFrom in edit mode', async () => {
    renderWithProviders(
      <ScheduleForm mode="edit" defaultValues={mockDefaultValues} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect((screen.getByTestId('schedule-form-day') as HTMLSelectElement).value).toBe('MONDAY')
    })

    fireEvent.change(screen.getByTestId('schedule-form-valid-from'), { target: { value: '2025-12-01' } })
    fireEvent.change(screen.getByTestId('schedule-form-valid-until'), { target: { value: '2025-11-01' } })

    await userEvent.click(screen.getByTestId('schedule-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Data final deve ser após a data inicial')).toBeInTheDocument()
    })
  })

  it('shows validation error when startTime is cleared in edit mode', async () => {
    renderWithProviders(
      <ScheduleForm mode="edit" defaultValues={mockDefaultValues} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect((screen.getByTestId('schedule-form-start-time') as HTMLInputElement).value).toBe('08:00')
    })

    await userEvent.clear(screen.getByTestId('schedule-form-start-time'))
    await userEvent.click(screen.getByTestId('schedule-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Horário inválido. Use HH:MM')).toBeInTheDocument()
    })
  })

  it('shows validation error when day is changed to empty in edit mode', async () => {
    renderWithProviders(
      <ScheduleForm mode="edit" defaultValues={mockDefaultValues} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect((screen.getByTestId('schedule-form-day') as HTMLSelectElement).value).toBe('MONDAY')
    })

    await userEvent.selectOptions(screen.getByTestId('schedule-form-day'), '')
    await userEvent.click(screen.getByTestId('schedule-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('schedule-form-day')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  it('calls onSubmit with defaultValues on submit', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <ScheduleForm mode="edit" defaultValues={mockDefaultValues} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect((screen.getByTestId('schedule-form-day') as HTMLSelectElement).value).toBe('MONDAY')
    })

    await userEvent.click(screen.getByTestId('schedule-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          dayOfWeek: 'MONDAY',
          startTime: '08:00',
          endTime: '12:00',
          slotDurationInMinutes: 30,
          validFrom: null,
          validUntil: null,
        }),
        expect.any(Function),
      )
    })
  })

  it('calls onSubmit when time fields are typed directly in edit mode', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <ScheduleForm mode="edit" defaultValues={mockDefaultValues} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect((screen.getByTestId('schedule-form-day') as HTMLSelectElement).value).toBe('MONDAY')
    })

    await userEvent.clear(screen.getByTestId('schedule-form-start-time'))
    await userEvent.type(screen.getByTestId('schedule-form-start-time'), '09:00')
    await userEvent.clear(screen.getByTestId('schedule-form-end-time'))
    await userEvent.type(screen.getByTestId('schedule-form-end-time'), '12:00')
    await userEvent.clear(screen.getByTestId('schedule-form-slot'))
    await userEvent.type(screen.getByTestId('schedule-form-slot'), '30')

    await userEvent.click(screen.getByTestId('schedule-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime: '09:00',
          endTime: '12:00',
          slotDurationInMinutes: 30,
        }),
        expect.any(Function),
      )
    })
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
