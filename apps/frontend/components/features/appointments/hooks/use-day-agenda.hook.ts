import { useAppointments } from './use-appointments.hook'
import { useAvailability } from './use-availability.hook'
import type { IAgendaSlot } from '../types/appointment-model.types'

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

  const all = [...freeSlots, ...bookedSlots].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  )

  return { slots: all, isLoading, isError }
}
