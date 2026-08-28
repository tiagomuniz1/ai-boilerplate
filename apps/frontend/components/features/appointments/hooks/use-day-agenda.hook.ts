import { AppointmentStatus } from '@app/shared'
import { useAppointments } from './use-appointments.hook'
import { useAvailability } from './use-availability.hook'
import type { IAgendaSlot } from '../types/appointment-model.types'

// Availability only withholds a slot while an appointment is SCHEDULED, so a
// cancelled, confirmed, completed or no-show appointment comes back as a free
// slot *and* as an appointment. Concatenating the two lists rendered the same
// time twice — one row offering "Livre — clique para agendar" and another right
// below it with the appointment — which reads as a double booking.
//
// One row per start time, then. The appointment wins, except when it is only a
// cancelled one and the slot is genuinely free again: there, the bookable slot is
// the useful row, and the cancellation stays visible in the appointment list and
// in the patient history. A cancelled appointment with no matching free slot (the
// schedule changed since) is still shown, so nothing disappears without a trace.
function pickSlot(candidates: IAgendaSlot[]): IAgendaSlot {
  const active = candidates.find(
    (s) =>
      s.appointment !== null &&
      s.appointment.status !== AppointmentStatus.CANCELLED,
  )
  if (active) return active

  const free = candidates.find((s) => s.appointment === null)
  if (free) return free

  return candidates[0]
}

export function mergeSlotsByStartTime(
  freeSlots: IAgendaSlot[],
  bookedSlots: IAgendaSlot[],
): IAgendaSlot[] {
  const byStartTime = new Map<string, IAgendaSlot[]>()

  for (const slot of [...freeSlots, ...bookedSlots]) {
    const group = byStartTime.get(slot.startTime)
    if (group) group.push(slot)
    else byStartTime.set(slot.startTime, [slot])
  }

  return [...byStartTime.values()]
    .map(pickSlot)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export function useDayAgenda(
  professionalId: string | null,
  date: string,
): { slots: IAgendaSlot[]; isLoading: boolean; isError: boolean } {
  const isSelf = professionalId === 'self'
  const enabled = professionalId !== null

  const availabilityParams = enabled
    ? {
        professionalId: isSelf ? undefined : (professionalId ?? /* c8 ignore next */ undefined),
        date,
        professionalIdKey: isSelf ? 'self' : professionalId!,
      }
    : null

  const appointmentParams = enabled
    ? {
        professionalId: isSelf ? undefined : (professionalId ?? /* c8 ignore next */ undefined),
        from: date,
        to: date,
        limit: 100,
      }
    : undefined

  const availability = useAvailability(availabilityParams)
  const appointments = useAppointments(enabled ? appointmentParams : undefined)

  const isLoading =
    (enabled && availability.isLoading) || (enabled && appointments.isLoading)
  const isError =
    (enabled && availability.isError) || (enabled && appointments.isError)

  if (!enabled) {
    return { slots: [], isLoading: false, isError: false }
  }

  const freeSlots: IAgendaSlot[] = (availability.data ?? []).map((slot) => ({
    startTime: slot.startTime,
    endTime: slot.endTime,
    status: 'free',
    appointment: null,
  }))

  const bookedSlots: IAgendaSlot[] = (appointments.data?.data ?? []).map((apt) => ({
    startTime: apt.startTime,
    endTime: apt.endTime,
    status: 'booked',
    appointment: apt,
  }))

  return { slots: mergeSlotsByStartTime(freeSlots, bookedSlots), isLoading, isError }
}
