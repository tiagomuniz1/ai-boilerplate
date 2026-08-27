import type { RecurrenceInterval } from '@app/shared'

/** Shape of the booking form, shared with the recurrence sub-form. */
export interface IBookFormValues {
  patientId: string
  reason?: string
  specialtyId: string
  isRecurring: boolean
  recurrenceInterval: RecurrenceInterval
  endMode: 'occurrences' | 'until'
  occurrenceCount: string
  untilDate: string
}
