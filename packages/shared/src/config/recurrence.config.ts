import { RecurrenceInterval } from '../enums/recurrence-interval.enum'

export const RECURRENCE_INTERVAL_IN_WEEKS: Record<RecurrenceInterval, number> = {
  [RecurrenceInterval.EVERY_WEEK]: 1,
  [RecurrenceInterval.EVERY_TWO_WEEKS]: 2,
  [RecurrenceInterval.EVERY_FOUR_WEEKS]: 4,
}

export const RECURRENCE_INTERVAL_LABELS: Record<RecurrenceInterval, string> = {
  [RecurrenceInterval.EVERY_WEEK]: 'A cada 1 semana',
  [RecurrenceInterval.EVERY_TWO_WEEKS]: 'A cada 2 semanas',
  [RecurrenceInterval.EVERY_FOUR_WEEKS]: 'A cada 4 semanas',
}

/**
 * A series is capped by whichever limit is reached first. 26 occurrences covers
 * a 6-month weekly package or a 1-year fortnightly one; the 365-day horizon is
 * what actually cuts an "every four weeks" series, and it also stops an absurd
 * untilDate from generating a huge list.
 */
export const MINIMUM_RECURRING_OCCURRENCES = 2
export const MAXIMUM_RECURRING_OCCURRENCES = 26
export const MAXIMUM_RECURRENCE_HORIZON_IN_DAYS = 365
