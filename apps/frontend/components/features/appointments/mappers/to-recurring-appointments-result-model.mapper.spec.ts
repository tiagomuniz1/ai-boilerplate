import { AppointmentStatus, DayOfWeek, RecurrenceInterval } from '@app/shared'
import { toRecurringAppointmentsResultModel } from './to-recurring-appointments-result-model.mapper'

const makeAppointmentDto = (date: string, sequence: number) => ({
  id: `apt-${sequence}`,
  professionalId: 'doc-uuid',
  professionalName: 'Dr. João Silva',
  patientId: 'pat-uuid',
  patientName: 'Maria Souza',
  specialtyId: null,
  specialtyName: null,
  scheduleId: 'sched-uuid',
  date,
  startTime: '09:00',
  endTime: '09:30',
  status: AppointmentStatus.SCHEDULED,
  insuranceType: null,
  reason: null,
  cancellationReason: null,
  seriesId: 'series-uuid',
  seriesSequence: sequence,
  seriesTotalOccurrences: 2,
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-01T10:00:00.000Z'),
})

describe('toRecurringAppointmentsResultModel', () => {
  it('maps the series id and every created occurrence', () => {
    const model = toRecurringAppointmentsResultModel({
      seriesId: 'series-uuid',
      recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
      dayOfWeek: DayOfWeek.TUESDAY,
      startTime: '09:00',
      createdOccurrenceCount: 2,
      appointments: [makeAppointmentDto('2099-06-16', 1), makeAppointmentDto('2099-06-23', 2)],
    })

    expect(model.seriesId).toBe('series-uuid')
    expect(model.createdOccurrenceCount).toBe(2)
    expect(model.appointments).toHaveLength(2)
    expect(model.appointments[1].seriesSequence).toBe(2)
    expect(model.appointments[1].seriesTotalOccurrences).toBe(2)
    expect(model.appointments[0].createdAt).toBeInstanceOf(Date)
  })
})
