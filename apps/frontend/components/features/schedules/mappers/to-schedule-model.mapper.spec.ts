import { DayOfWeek } from '@app/shared'
import { toScheduleModel } from './to-schedule-model.mapper'

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  doctorId: 'doc-uuid-1',
  doctorName: 'Dr. João Silva',
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
  validFrom: null,
  validUntil: null,
  createdAt: new Date('2025-01-01T10:00:00.000Z'),
  updatedAt: new Date('2025-01-02T10:00:00.000Z'),
  ...overrides,
})

describe('toScheduleModel', () => {
  it('maps all fields correctly', () => {
    const dto = makeDto()
    const model = toScheduleModel(dto)

    expect(model.id).toBe('uuid-1')
    expect(model.doctorId).toBe('doc-uuid-1')
    expect(model.doctorName).toBe('Dr. João Silva')
    expect(model.dayOfWeek).toBe(DayOfWeek.MONDAY)
    expect(model.startTime).toBe('08:00')
    expect(model.endTime).toBe('12:00')
    expect(model.slotDurationInMinutes).toBe(30)
    expect(model.validFrom).toBeNull()
    expect(model.validUntil).toBeNull()
  })

  it('converts createdAt and updatedAt to Date objects', () => {
    const dto = makeDto()
    const model = toScheduleModel(dto)

    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.updatedAt).toBeInstanceOf(Date)
    expect(model.createdAt.toISOString()).toBe('2025-01-01T10:00:00.000Z')
    expect(model.updatedAt.toISOString()).toBe('2025-01-02T10:00:00.000Z')
  })

  it('preserves validFrom and validUntil as string when set', () => {
    const dto = makeDto({ validFrom: '2025-03-01', validUntil: '2025-12-31' })
    const model = toScheduleModel(dto)

    expect(model.validFrom).toBe('2025-03-01')
    expect(model.validUntil).toBe('2025-12-31')
  })

  it('preserves null validFrom and validUntil', () => {
    const dto = makeDto({ validFrom: null, validUntil: null })
    const model = toScheduleModel(dto)

    expect(model.validFrom).toBeNull()
    expect(model.validUntil).toBeNull()
  })
})
