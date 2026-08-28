import { RecurrenceInterval } from '@app/shared'
import { toBookRecurringAppointmentsDto } from './to-book-recurring-appointments-dto.mapper'

const base = {
  patientId: 'pat-uuid',
  startTime: '09:00',
  recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
  dates: ['2099-06-16', '2099-06-23'],
}

describe('toBookRecurringAppointmentsDto', () => {
  it('maps every field', () => {
    expect(
      toBookRecurringAppointmentsDto({
        ...base,
        professionalId: 'doc-uuid',
        specialtyId: 'spec-uuid',
        occurrenceCount: 2,
        reason: 'Sessão de fisioterapia',
      }),
    ).toEqual({
      professionalId: 'doc-uuid',
      specialtyId: 'spec-uuid',
      patientId: 'pat-uuid',
      startTime: '09:00',
      recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
      dates: ['2099-06-16', '2099-06-23'],
      occurrenceCount: 2,
      untilDate: undefined,
      reason: 'Sessão de fisioterapia',
    })
  })

  it('turns empty optional strings into undefined so they are omitted from the payload', () => {
    const dto = toBookRecurringAppointmentsDto({ ...base, specialtyId: '', reason: '' })

    expect(dto.specialtyId).toBeUndefined()
    expect(dto.reason).toBeUndefined()
  })

  it('maps an until date instead of an occurrence count', () => {
    const dto = toBookRecurringAppointmentsDto({ ...base, untilDate: '2099-08-01' })

    expect(dto.untilDate).toBe('2099-08-01')
    expect(dto.occurrenceCount).toBeUndefined()
  })
})
