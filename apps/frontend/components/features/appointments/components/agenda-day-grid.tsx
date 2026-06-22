'use client'

import { useState } from 'react'
import { UserRole } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useScheduleExceptions } from '@/components/features/schedule-exceptions/hooks/use-schedule-exceptions.hook'
import { BlockBanner } from '@/components/features/schedule-exceptions/components/BlockBanner'
import { useDayAgenda } from '../hooks/use-day-agenda.hook'
import { AgendaSkeleton } from './agenda-skeleton'
import { AppointmentSlotCell } from './appointment-slot-cell'
import { BookAppointmentDialog } from './book-appointment-dialog'
import { AppointmentDetailsDialog } from './appointment-details-dialog'
import type { IAgendaSlot } from '../types/appointment-model.types'

interface AgendaDayGridProps {
  doctorId: string | null
  date: string
  role: UserRole
  currentDoctorId?: string
  effectiveDoctorId?: string
}

export function AgendaDayGrid({
  doctorId,
  date,
  role,
  currentDoctorId,
  effectiveDoctorId,
}: AgendaDayGridProps) {
  const [bookingSlot, setBookingSlot] = useState<IAgendaSlot | null>(null)
  const [detailsId, setDetailsId] = useState<string | null>(null)

  const { slots, isLoading, isError } = useDayAgenda(doctorId, date)
  const { data: exceptions = [] } = useScheduleExceptions(
    doctorId !== null ? { doctorId: doctorId === 'self' ? undefined : doctorId, from: date, to: date } : undefined,
  )

  const canManage = role === UserRole.ADMIN || role === UserRole.DOCTOR

  function isSlotPast(startTime: string): boolean {
    return new Date(`${date}T${startTime}:00`) < new Date()
  }

  if (doctorId === null) {
    return (
      <div data-testid="agenda-empty-doctor" className="py-12 text-center text-sm text-text/50">
        Selecione um médico para visualizar a agenda.
      </div>
    )
  }

  if (isLoading) return <AgendaSkeleton />

  if (isError) {
    return (
      <Alert variant="error" data-testid="agenda-day-error">
        Erro ao carregar a agenda. Tente novamente.
      </Alert>
    )
  }

  if (slots.length === 0 && exceptions.length === 0) {
    return (
      <div data-testid="agenda-day-empty" className="py-12 text-center text-sm text-text/50">
        Sem horários disponíveis nesta data.
      </div>
    )
  }

  return (
    <>
      <div data-testid="agenda-day-grid" className="space-y-1.5">
        {exceptions.map((exception) => (
          <BlockBanner key={exception.id} exception={exception} role={role} />
        ))}
        {slots.map((slot, i) => (
          <AppointmentSlotCell
            key={`${slot.startTime}-${i}`}
            slot={slot}
            canManage={canManage}
            isPast={isSlotPast(slot.startTime)}
            onBookClick={() => setBookingSlot(slot)}
            /* c8 ignore next */
            onDetailsClick={() => setDetailsId(slot.appointment?.id ?? null)}
          />
        ))}
      </div>

      <BookAppointmentDialog
        isOpen={bookingSlot !== null}
        onClose={() => setBookingSlot(null)}
        date={date}
        startTime={bookingSlot?.startTime ?? ''}
        endTime={bookingSlot?.endTime ?? ''}
        doctorId={effectiveDoctorId ?? currentDoctorId}
      />

      <AppointmentDetailsDialog
        appointmentId={detailsId}
        isOpen={detailsId !== null}
        onClose={() => setDetailsId(null)}
        role={role}
        currentDoctorId={currentDoctorId}
      />
    </>
  )
}
