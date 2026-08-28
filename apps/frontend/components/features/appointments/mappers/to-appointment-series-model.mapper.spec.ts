import { AppointmentStatus, DayOfWeek, RecurrenceInterval } from '@app/shared'
import { toAppointmentSeriesModel } from './to-appointment-series-model.mapper'

const makeDto = (overrides = {}) => ({
  id: 'series-uuid',
  professionalId: 'doc-uuid',
  professionalName: 'Dr. João Silva',
  patientId: 'pat-uuid',
  patientName: 'Maria Souza',
  specialtyId: 'spec-uuid',
  specialtyName: 'Fisioterapia',
  recurrenceInterval: RecurrenceInterval.EVERY_TWO_WEEKS,
  dayOfWeek: DayOfWeek.TUESDAY,
  startTime: '09:00',
  anchorDate: '2099-06-16',
  requestedOccurrenceCount: 2,
  requestedUntilDate: null,
  createdOccurrenceCount: 2,
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  occurrences: [
    {
      id: 'apt-1',
      professionalId: 'doc-uuid',
      professionalName: 'Dr. João Silva',
      patientId: 'pat-uuid',
      patientName: 'Maria Souza',
      specialtyId: 'spec-uuid',
      specialtyName: 'Fisioterapia',
      scheduleId: 'sched-uuid',
      date: '2099-06-16',
      startTime: '09:00',
      endTime: '09:30',
      status: AppointmentStatus.SCHEDULED,
      insuranceType: null,
      reason: null,
      cancellationReason: null,
      seriesId: 'series-uuid',
      seriesSequence: 1,
      seriesTotalOccurrences: 2,
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      updatedAt: new Date('2026-01-01T10:00:00.000Z'),
    },
  ],
  ...overrides,
})

describe('toAppointmentSeriesModel', () => {
  it('maps the series rule and its occurrences', () => {
    const model = toAppointmentSeriesModel(makeDto())

    expect(model.id).toBe('series-uuid')
    expect(model.professionalName).toBe('Dr. João Silva')
    expect(model.patientName).toBe('Maria Souza')
    expect(model.specialtyName).toBe('Fisioterapia')
    expect(model.recurrenceInterval).toBe(RecurrenceInterval.EVERY_TWO_WEEKS)
    expect(model.dayOfWeek).toBe(DayOfWeek.TUESDAY)
    expect(model.anchorDate).toBe('2099-06-16')
    expect(model.createdOccurrenceCount).toBe(2)
    expect(model.occurrences).toHaveLength(1)
    expect(model.occurrences[0].seriesSequence).toBe(1)
  })

  it('maps a series without a specialty', () => {
    const model = toAppointmentSeriesModel(makeDto({ specialtyId: null, specialtyName: null }))

    expect(model.specialtyName).toBeNull()
  })
})
