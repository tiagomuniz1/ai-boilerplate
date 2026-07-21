import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppointmentStatus } from '@app/shared'
import { AppointmentSlotCell } from './appointment-slot-cell'
import type { IAgendaSlot } from '../types/appointment-model.types'

const freeSlot: IAgendaSlot = {
  startTime: '09:00',
  endTime: '09:30',
  status: 'free',
  appointment: null,
}

const makeBookedSlot = (appointment: IAgendaSlot['appointment']): IAgendaSlot => ({
  startTime: '10:00',
  endTime: '10:30',
  status: 'booked',
  appointment,
})

describe('AppointmentSlotCell', () => {
  it('renders free bookable slot when canManage and not past', () => {
    render(
      <AppointmentSlotCell
        slot={freeSlot}
        canManage={true}
        isPast={false}
        onBookClick={jest.fn()}
        onDetailsClick={jest.fn()}
      />,
    )
    expect(screen.getByTestId('agenda-slot-free')).toBeInTheDocument()
    expect(screen.getByTestId('agenda-slot-free')).not.toBeDisabled()
    expect(screen.getByText(/Livre — clique para agendar/)).toBeInTheDocument()
  })

  it('renders free disabled slot when canManage but is past', () => {
    render(
      <AppointmentSlotCell
        slot={freeSlot}
        canManage={true}
        isPast={true}
        onBookClick={jest.fn()}
        onDetailsClick={jest.fn()}
      />,
    )
    expect(screen.getByTestId('agenda-slot-free')).toBeDisabled()
    expect(screen.getByText('Passado')).toBeInTheDocument()
  })

  it('renders free read-only slot when cannot manage and not past', () => {
    render(
      <AppointmentSlotCell
        slot={freeSlot}
        canManage={false}
        isPast={false}
        onBookClick={jest.fn()}
        onDetailsClick={jest.fn()}
      />,
    )
    expect(screen.getByTestId('agenda-slot-free')).toBeDisabled()
    expect(screen.getByText('Livre')).toBeInTheDocument()
  })

  it('renders booked slot when appointment is present', () => {
    const slot = makeBookedSlot({
      id: 'appt-1',
      professionalId: 'doc-1',
      professionalName: 'Dr. A',
      patientId: 'pat-1',
      patientName: 'Patient One',
      specialtyId: null,
      specialtyName: null,
      scheduleId: 'sched-1',
      date: '2025-06-10',
      startTime: '10:00',
      endTime: '10:30',
      status: AppointmentStatus.SCHEDULED,
      reason: null,
      cancellationReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    render(
      <AppointmentSlotCell
        slot={slot}
        canManage={true}
        isPast={false}
        onBookClick={jest.fn()}
        onDetailsClick={jest.fn()}
      />,
    )
    expect(screen.getByTestId('agenda-slot-booked')).toBeInTheDocument()
    expect(screen.getByText('Patient One')).toBeInTheDocument()
  })

  it('calls onBookClick when free bookable slot is clicked', async () => {
    const onBookClick = jest.fn()
    render(
      <AppointmentSlotCell
        slot={freeSlot}
        canManage={true}
        isPast={false}
        onBookClick={onBookClick}
        onDetailsClick={jest.fn()}
      />,
    )
    await userEvent.click(screen.getByTestId('agenda-slot-free'))
    expect(onBookClick).toHaveBeenCalledTimes(1)
  })

  it('returns null when slot is booked but appointment is null', () => {
    const { container } = render(
      <AppointmentSlotCell
        slot={makeBookedSlot(null)}
        canManage={true}
        isPast={false}
        onBookClick={jest.fn()}
        onDetailsClick={jest.fn()}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})
