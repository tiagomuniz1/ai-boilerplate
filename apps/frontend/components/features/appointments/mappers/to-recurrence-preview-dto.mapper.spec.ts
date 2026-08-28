import { RecurrenceInterval } from '@app/shared'
import { toRecurrencePreviewDto } from './to-recurrence-preview-dto.mapper'

describe('toRecurrencePreviewDto', () => {
  const base = {
    patientId: 'pat-uuid',
    date: '2099-06-16',
    startTime: '09:00',
    recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
  }

  it('maps every field when the series is bounded by an occurrence count', () => {
    expect(toRecurrencePreviewDto({ ...base, professionalId: 'doc-uuid', occurrenceCount: 4 })).toEqual({
      professionalId: 'doc-uuid',
      patientId: 'pat-uuid',
      date: '2099-06-16',
      startTime: '09:00',
      recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
      occurrenceCount: 4,
      untilDate: undefined,
    })
  })

  it('maps an until date and leaves professionalId undefined for a self-booking professional', () => {
    const dto = toRecurrencePreviewDto({ ...base, untilDate: '2099-08-01' })

    expect(dto.professionalId).toBeUndefined()
    expect(dto.untilDate).toBe('2099-08-01')
    expect(dto.occurrenceCount).toBeUndefined()
  })
})
