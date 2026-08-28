import { RecurringOccurrenceAvailability } from '@app/shared'

export const RECURRENCE_STATUS_LABELS: Record<RecurringOccurrenceAvailability, string> = {
  [RecurringOccurrenceAvailability.AVAILABLE]: 'Disponível',
  [RecurringOccurrenceAvailability.ALREADY_BOOKED]: 'Ocupado',
  [RecurringOccurrenceAvailability.OUTSIDE_SCHEDULE]: 'Fora da agenda',
  [RecurringOccurrenceAvailability.BLOCKED_BY_EXCEPTION]: 'Bloqueado',
  [RecurringOccurrenceAvailability.IN_THE_PAST]: 'No passado',
}

export const RECURRENCE_STATUS_BADGE_CLASS: Record<RecurringOccurrenceAvailability, string> = {
  [RecurringOccurrenceAvailability.AVAILABLE]: 'bg-good/10 text-good',
  [RecurringOccurrenceAvailability.ALREADY_BOOKED]: 'bg-danger/10 text-danger',
  [RecurringOccurrenceAvailability.OUTSIDE_SCHEDULE]: 'bg-warn/10 text-warn',
  [RecurringOccurrenceAvailability.BLOCKED_BY_EXCEPTION]: 'bg-warn/10 text-warn',
  [RecurringOccurrenceAvailability.IN_THE_PAST]: 'bg-surface-2 text-text/50',
}
