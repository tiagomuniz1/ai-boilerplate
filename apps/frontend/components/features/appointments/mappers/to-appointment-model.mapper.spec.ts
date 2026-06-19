import { AppointmentStatus } from '@app/shared'
import { toAppointmentModel } from './to-appointment-model.mapper'

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  doctorId: 'doc-uuid',
  doctorName: 'Dr. João Silva',
  patientId: 'pat-uuid',
  patientName: 'Maria Souza',
  scheduleId: 'sched-uuid',
  date: '2025-06-20',
  startTime: '08:00',
  endTime: '08:30',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  createdAt: new Date('2025-01-01T10:00:00.000Z'),
  updatedAt: new Date('2025-01-02T10:00:00.000Z'),
  ...overrides,
})

describe('toAppointmentModel', () => {
  it('maps all scalar fields correctly', () => {
    const dto = makeDto()
    const model = toAppointmentModel(dto)

    expect(model.id).toBe('uuid-1')
    expect(model.doctorId).toBe('doc-uuid')
    expect(model.doctorName).toBe('Dr. João Silva')
    expect(model.patientId).toBe('pat-uuid')
    expect(model.patientName).toBe('Maria Souza')
    expect(model.scheduleId).toBe('sched-uuid')
    expect(model.date).toBe('2025-06-20')
    expect(model.startTime).toBe('08:00')
    expect(model.endTime).toBe('08:30')
    expect(model.status).toBe(AppointmentStatus.SCHEDULED)
  })

  it('converts createdAt and updatedAt to Date objects', () => {
    const dto = makeDto()
    const model = toAppointmentModel(dto)

    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.updatedAt).toBeInstanceOf(Date)
    expect(model.createdAt.toISOString()).toBe('2025-01-01T10:00:00.000Z')
    expect(model.updatedAt.toISOString()).toBe('2025-01-02T10:00:00.000Z')
  })

  it('preserves reason as null when not set', () => {
    const model = toAppointmentModel(makeDto({ reason: null }))
    expect(model.reason).toBeNull()
  })

  it('preserves reason as string when set', () => {
    const model = toAppointmentModel(makeDto({ reason: 'Consulta de rotina' }))
    expect(model.reason).toBe('Consulta de rotina')
  })

  it('preserves cancellationReason as null when not set', () => {
    const model = toAppointmentModel(makeDto({ cancellationReason: null }))
    expect(model.cancellationReason).toBeNull()
  })

  it('preserves cancellationReason as string when set', () => {
    const model = toAppointmentModel(makeDto({ cancellationReason: 'Paciente indisponível' }))
    expect(model.cancellationReason).toBe('Paciente indisponível')
  })

  it('maps CANCELLED status correctly', () => {
    const model = toAppointmentModel(makeDto({ status: AppointmentStatus.CANCELLED }))
    expect(model.status).toBe(AppointmentStatus.CANCELLED)
  })

  it('maps COMPLETED status correctly', () => {
    const model = toAppointmentModel(makeDto({ status: AppointmentStatus.COMPLETED }))
    expect(model.status).toBe(AppointmentStatus.COMPLETED)
  })
})
