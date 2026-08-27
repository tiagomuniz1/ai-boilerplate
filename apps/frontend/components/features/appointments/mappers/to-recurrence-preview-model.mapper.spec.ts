import { DayOfWeek, RecurrenceInterval, RecurringOccurrenceAvailability } from '@app/shared'
import { toRecurrencePreviewModel } from './to-recurrence-preview-model.mapper'

const makeDto = (overrides = {}) => ({
  professionalId: 'doc-uuid',
  patientId: 'pat-uuid',
  recurrenceInterval: RecurrenceInterval.EVERY_TWO_WEEKS,
  dayOfWeek: DayOfWeek.TUESDAY,
  startTime: '09:00',
  occurrences: [
    {
      date: '2099-06-16',
      startTime: '09:00',
      endTime: '09:30',
      scheduleId: 'sched-uuid',
      availability: RecurringOccurrenceAvailability.AVAILABLE,
      selectable: true,
    },
    {
      date: '2099-06-30',
      startTime: '09:00',
      endTime: null,
      scheduleId: null,
      availability: RecurringOccurrenceAvailability.ALREADY_BOOKED,
      selectable: false,
    },
  ],
  availableOccurrenceCount: 1,
  unavailableOccurrenceCount: 1,
  truncatedByMaximumOccurrences: false,
  truncatedByHorizon: false,
  ...overrides,
})

describe('toRecurrencePreviewModel', () => {
  it('maps the rule, the counters and every occurrence', () => {
    const model = toRecurrencePreviewModel(makeDto())

    expect(model.professionalId).toBe('doc-uuid')
    expect(model.recurrenceInterval).toBe(RecurrenceInterval.EVERY_TWO_WEEKS)
    expect(model.dayOfWeek).toBe(DayOfWeek.TUESDAY)
    expect(model.startTime).toBe('09:00')
    expect(model.availableOccurrenceCount).toBe(1)
    expect(model.unavailableOccurrenceCount).toBe(1)
    expect(model.occurrences).toEqual([
      {
        date: '2099-06-16',
        startTime: '09:00',
        endTime: '09:30',
        availability: RecurringOccurrenceAvailability.AVAILABLE,
        selectable: true,
      },
      {
        date: '2099-06-30',
        startTime: '09:00',
        endTime: null,
        availability: RecurringOccurrenceAvailability.ALREADY_BOOKED,
        selectable: false,
      },
    ])
  })

  it('carries the truncation flags through', () => {
    const model = toRecurrencePreviewModel(
      makeDto({ truncatedByMaximumOccurrences: true, truncatedByHorizon: true }),
    )

    expect(model.truncatedByMaximumOccurrences).toBe(true)
    expect(model.truncatedByHorizon).toBe(true)
  })

  it('maps an empty occurrence list', () => {
    expect(toRecurrencePreviewModel(makeDto({ occurrences: [] })).occurrences).toEqual([])
  })
})
