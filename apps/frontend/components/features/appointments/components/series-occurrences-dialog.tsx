'use client'

import { useRouter } from 'next/navigation'
import { RECURRENCE_INTERVAL_LABELS } from '@app/shared'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { APPOINTMENT_STATUS_BADGE_CLASS } from '@/lib/appointment-status'
import { formatDateToBR, getWeekdayNamePtBR } from '@/lib/format-date'
import { useBasePath } from '@/lib/slug-context'
import { cn } from '@/lib/cn'
import { useAppointmentSeries } from '../hooks/use-appointment-series.hook'
import { APPOINTMENT_STATUS_LABELS } from '../types/appointment-model.types'

interface SeriesOccurrencesDialogProps {
  seriesId: string | null
  isOpen: boolean
  onClose: () => void
  currentAppointmentId?: string
}

export function SeriesOccurrencesDialog({
  seriesId,
  isOpen,
  onClose,
  currentAppointmentId,
}: SeriesOccurrencesDialogProps) {
  const router = useRouter()
  const basePath = useBasePath()
  const { data: series, isLoading, isError } = useAppointmentSeries(isOpen ? seriesId : null)

  function goToOccurrence(appointmentId: string) {
    router.push(`${basePath}/appointments/${appointmentId}`)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Série de consultas" data-testid="series-dialog">
      {isLoading && (
        <div data-testid="series-dialog-loading" className="space-y-2 py-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <Alert variant="error" data-testid="series-dialog-error">
          Erro ao carregar a série de consultas.
        </Alert>
      )}

      {series && !isLoading && (
        <div className="space-y-4">
          <div className="rounded-md bg-surface-2 px-3 py-2 text-sm" data-testid="series-dialog-summary">
            <p className="font-medium">
              Toda {getWeekdayNamePtBR(series.anchorDate)} às {series.startTime}
            </p>
            <p className="text-text/60">
              {RECURRENCE_INTERVAL_LABELS[series.recurrenceInterval]} ·{' '}
              {series.createdOccurrenceCount} consultas
            </p>
          </div>

          <ul className="max-h-[50vh] space-y-1 overflow-y-auto" data-testid="series-dialog-list">
            {series.occurrences.map((occurrence, index) => (
              <li key={occurrence.id}>
                <button
                  type="button"
                  onClick={() => goToOccurrence(occurrence.id)}
                  data-testid={`series-dialog-item-${occurrence.date}`}
                  aria-current={occurrence.id === currentAppointmentId ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md border border-line px-3 py-2 text-left text-sm',
                    'transition-colors hover:border-accent hover:bg-accent/5',
                    occurrence.id === currentAppointmentId && 'border-accent bg-accent/5',
                  )}
                >
                  <span className="w-16 shrink-0 text-xs text-text/50">Sessão {index + 1}</span>
                  <span className="font-medium">{formatDateToBR(occurrence.date)}</span>
                  <span className="font-mono text-xs text-text/60">{occurrence.startTime}</span>
                  <span
                    data-testid={`series-dialog-status-${occurrence.date}`}
                    className={cn(
                      'ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                      APPOINTMENT_STATUS_BADGE_CLASS[occurrence.status],
                    )}
                  >
                    {APPOINTMENT_STATUS_LABELS[occurrence.status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}
