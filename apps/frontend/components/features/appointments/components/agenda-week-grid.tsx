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

const WEEK_DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function getWeekDates(startDate: string): string[] {
  const dates: string[] = []
  const base = new Date(`${startDate}T00:00:00`)
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

interface DayColumnProps {
  doctorId: string
  date: string
  dayLabel: string
  role: UserRole
  currentDoctorId?: string
  effectiveDoctorId?: string
}

function DayColumn({ doctorId, date, dayLabel, role, currentDoctorId, effectiveDoctorId }: DayColumnProps) {
  const [bookingSlot, setBookingSlot] = useState<IAgendaSlot | null>(null)
  const [detailsId, setDetailsId] = useState<string | null>(null)

  const { slots, isLoading, isError } = useDayAgenda(doctorId, date)
  const { data: exceptions = [] } = useScheduleExceptions(
    { doctorId: doctorId === 'self' ? undefined : doctorId, from: date, to: date },
  )
  const canManage = role === UserRole.ADMIN || role === UserRole.PROFESSIONAL

  function isSlotPast(startTime: string): boolean {
    return new Date(`${date}T${startTime}:00`) < new Date()
  }

  const dateNum = date.split('-')[2]

  return (
    <>
      <div className="flex flex-col min-w-0">
        <div className="text-center pb-2 border-b border-line mb-2">
          <span className="text-xs text-text/50">{dayLabel}</span>
          <p className="text-sm font-medium">{dateNum}</p>
        </div>

        {isLoading ? (
          <AgendaSkeleton />
        ) : isError ? (
          <Alert variant="error" className="text-xs py-1 px-2">Erro</Alert>
        ) : slots.length === 0 && exceptions.length === 0 ? (
          <div className="text-xs text-center text-text/40 py-4">Sem horários</div>
        ) : (
          <div className="space-y-1" data-testid={`week-day-slots-${date}`}>
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
        )}
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

interface AgendaWeekGridProps {
  doctorId: string | null
  startDate: string
  role: UserRole
  currentDoctorId?: string
  effectiveDoctorId?: string
}

export function AgendaWeekGrid({
  doctorId,
  startDate,
  role,
  currentDoctorId,
  effectiveDoctorId,
}: AgendaWeekGridProps) {
  const dates = getWeekDates(startDate)

  if (doctorId === null) {
    return (
      <div data-testid="agenda-empty-doctor" className="py-12 text-center text-sm text-text/50">
        Selecione um médico para visualizar a agenda.
      </div>
    )
  }

  return (
    <div
      data-testid="agenda-week-grid"
      className="grid grid-cols-7 gap-2 overflow-x-auto"
    >
      {dates.map((date, i) => {
        const dayOfWeek = new Date(`${date}T00:00:00`).getDay()
        return (
          <DayColumn
            key={date}
            doctorId={doctorId}
            date={date}
            dayLabel={WEEK_DAY_LABELS[dayOfWeek]}
            role={role}
            currentDoctorId={currentDoctorId}
            effectiveDoctorId={effectiveDoctorId}
          />
        )
      })}
    </div>
  )
}
