'use client'

import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { RECURRENCE_STATUS_BADGE_CLASS, RECURRENCE_STATUS_LABELS } from '@/lib/recurrence-status'
import { formatDateToBR } from '@/lib/format-date'
import { cn } from '@/lib/cn'
import type { IRecurrencePreviewModel } from '../types/appointment-model.types'

interface RecurrencePreviewListProps {
  preview?: IRecurrencePreviewModel
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  selectedDates: string[]
  onToggleDate: (date: string) => void
  onToggleAll: () => void
}

export function RecurrencePreviewList({
  preview,
  isLoading,
  isError,
  onRetry,
  selectedDates,
  onToggleDate,
  onToggleAll,
}: RecurrencePreviewListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 py-2" data-testid="recurrence-preview-loading">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <Alert variant="error" data-testid="recurrence-preview-error">
          Não foi possível calcular as datas. Tente novamente.
        </Alert>
        <Button type="button" variant="ghost" onClick={onRetry} data-testid="recurrence-preview-retry">
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (!preview || preview.occurrences.length === 0) {
    return (
      <Alert variant="warning" data-testid="recurrence-preview-empty">
        Nenhuma data gerada com essa configuração.
      </Alert>
    )
  }

  const selectableCount = preview.occurrences.filter((occurrence) => occurrence.selectable).length
  const allSelected = selectableCount > 0 && selectedDates.length === selectableCount

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text/70" data-testid="recurrence-preview-summary">
          {preview.occurrences.length} datas · {preview.availableOccurrenceCount} disponíveis ·{' '}
          {preview.unavailableOccurrenceCount} indisponíveis
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleAll}
          disabled={selectableCount === 0}
          data-testid="recurrence-preview-toggle-all"
        >
          {allSelected ? 'Desmarcar todas' : 'Marcar todas'}
        </Button>
      </div>

      {preview.truncatedByMaximumOccurrences && (
        <Alert variant="warning" data-testid="recurrence-preview-truncated">
          A série foi limitada ao máximo de consultas permitido.
        </Alert>
      )}
      {preview.truncatedByHorizon && (
        <Alert variant="warning" data-testid="recurrence-preview-truncated-horizon">
          A série foi limitada a um ano a partir da primeira consulta.
        </Alert>
      )}

      <ul className="max-h-[50vh] space-y-1 overflow-y-auto" data-testid="recurrence-preview-list">
        {preview.occurrences.map((occurrence) => (
          <li key={occurrence.date}>
            <label
              data-testid={`recurrence-preview-item-${occurrence.date}`}
              className={cn(
                'flex w-full flex-wrap items-center gap-2 rounded-md border border-line px-3 py-2 text-sm',
                occurrence.selectable ? 'cursor-pointer hover:border-accent' : 'opacity-60',
              )}
            >
              <input
                type="checkbox"
                data-testid={`recurrence-preview-checkbox-${occurrence.date}`}
                // A non-available date would be rejected by the server anyway, so
                // leaving it tickable would only produce a guaranteed 409.
                disabled={!occurrence.selectable}
                checked={selectedDates.includes(occurrence.date)}
                onChange={() => onToggleDate(occurrence.date)}
              />
              <span className="font-medium">{formatDateToBR(occurrence.date)}</span>
              <span className="font-mono text-xs text-text/60">
                {occurrence.startTime}
                {occurrence.endTime ? ` – ${occurrence.endTime}` : ''}
              </span>
              <span
                data-testid={`recurrence-preview-status-${occurrence.date}`}
                className={cn(
                  'ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                  RECURRENCE_STATUS_BADGE_CLASS[occurrence.availability],
                )}
              >
                {RECURRENCE_STATUS_LABELS[occurrence.availability]}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <p className="text-sm font-medium" data-testid="recurrence-preview-selected-count">
        {selectedDates.length} datas selecionadas
      </p>
    </div>
  )
}
