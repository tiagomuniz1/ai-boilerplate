'use client'

import { cn } from '@/lib/cn'
import { AppointmentStatus } from '@app/shared'
import { APPOINTMENT_STATUS_LABELS } from '../types/appointment-model.types'
import type { IAgendaSlot } from '../types/appointment-model.types'

interface AppointmentSlotCellProps {
  slot: IAgendaSlot
  canManage: boolean
  isPast: boolean
  onBookClick: () => void
  onDetailsClick: () => void
}

export function AppointmentSlotCell({
  slot,
  canManage,
  isPast,
  onBookClick,
  onDetailsClick,
}: AppointmentSlotCellProps) {
  const isFree = slot.status === 'free'
  const isBooked = slot.status === 'booked'
  const apt = slot.appointment

  const statusColor: Record<AppointmentStatus, string> = {
    [AppointmentStatus.SCHEDULED]: 'bg-accent/10 border-accent text-accent',
    [AppointmentStatus.CANCELLED]: 'bg-danger/10 border-danger text-danger',
    [AppointmentStatus.COMPLETED]: 'bg-good/10 border-good text-good',
  }

  if (isFree) {
    const bookable = canManage && !isPast
    return (
      <button
        data-testid="agenda-slot-free"
        disabled={!bookable}
        onClick={bookable ? onBookClick : undefined}
        className={cn(
          'w-full text-left px-3 py-2 rounded-md border border-dashed border-line text-sm',
          'flex items-center gap-2',
          bookable
            ? 'hover:bg-accent/5 hover:border-accent cursor-pointer transition-colors'
            : 'cursor-default opacity-40',
        )}
        aria-label={bookable ? `Agendar ${slot.startTime}` : `Horário livre ${slot.startTime}`}
      >
        <span className="font-mono text-xs text-text/60 w-12 shrink-0">{slot.startTime}</span>
        <span className="text-text/40 text-xs">
          {isPast ? 'Passado' : canManage ? 'Livre — clique para agendar' : 'Livre'}
        </span>
      </button>
    )
  }

  if (isBooked && apt) {
    return (
      <button
        data-testid="agenda-slot-booked"
        onClick={onDetailsClick}
        className={cn(
          'w-full text-left px-3 py-2 rounded-md border text-sm',
          'flex items-center gap-2 cursor-pointer transition-colors',
          /* c8 ignore next */
          statusColor[apt.status] ?? 'bg-surface-2 border-line',
          'hover:opacity-80',
        )}
        aria-label={`Consulta ${apt.patientName} às ${slot.startTime}`}
      >
        <span className="font-mono text-xs w-12 shrink-0">{slot.startTime}</span>
        <span className="font-medium truncate">{apt.patientName}</span>
        <span className="ml-auto text-xs shrink-0">{APPOINTMENT_STATUS_LABELS[apt.status]}</span>
      </button>
    )
  }

  return null
}
