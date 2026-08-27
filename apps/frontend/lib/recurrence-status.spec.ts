import { RecurringOccurrenceAvailability } from '@app/shared'
import { RECURRENCE_STATUS_BADGE_CLASS, RECURRENCE_STATUS_LABELS } from './recurrence-status'

describe('recurrence-status', () => {
  const allStatuses = Object.values(RecurringOccurrenceAvailability)

  it('labels every availability in Brazilian Portuguese', () => {
    expect(RECURRENCE_STATUS_LABELS).toEqual({
      available: 'Disponível',
      already_booked: 'Ocupado',
      outside_schedule: 'Fora da agenda',
      blocked_by_exception: 'Bloqueado',
      in_the_past: 'No passado',
    })
  })

  it('has a badge class for every availability', () => {
    allStatuses.forEach((status) => {
      expect(RECURRENCE_STATUS_BADGE_CLASS[status]).toBeTruthy()
    })
  })

  it('paints only the available status with the positive token', () => {
    expect(RECURRENCE_STATUS_BADGE_CLASS[RecurringOccurrenceAvailability.AVAILABLE]).toContain('good')
    expect(RECURRENCE_STATUS_BADGE_CLASS[RecurringOccurrenceAvailability.ALREADY_BOOKED]).toContain(
      'danger',
    )
  })
})
