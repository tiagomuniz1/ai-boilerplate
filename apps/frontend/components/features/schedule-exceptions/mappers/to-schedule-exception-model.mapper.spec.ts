import { toScheduleExceptionModel } from './to-schedule-exception-model.mapper'
import type { ScheduleExceptionResponseDto } from '@app/shared'

const makeDto = (overrides: Partial<ScheduleExceptionResponseDto> = {}): ScheduleExceptionResponseDto => ({
  id: 'exc-uuid',
  doctorId: 'doc-uuid',
  date: '2099-06-20',
  startTime: '14:00',
  endTime: '18:00',
  reason: 'Congresso',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  ...overrides,
})

describe('toScheduleExceptionModel', () => {
  it('maps all fields correctly', () => {
    const dto = makeDto()
    const model = toScheduleExceptionModel(dto)

    expect(model.id).toBe('exc-uuid')
    expect(model.doctorId).toBe('doc-uuid')
    expect(model.date).toBe('2099-06-20')
    expect(model.startTime).toBe('14:00')
    expect(model.endTime).toBe('18:00')
    expect(model.reason).toBe('Congresso')
  })

  it('converts createdAt and updatedAt to Date instances', () => {
    const dto = makeDto()
    const model = toScheduleExceptionModel(dto)

    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.updatedAt).toBeInstanceOf(Date)
    expect(model.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z')
    expect(model.updatedAt.toISOString()).toBe('2024-01-02T00:00:00.000Z')
  })

  it('maps null startTime and endTime (all-day)', () => {
    const dto = makeDto({ startTime: null, endTime: null })
    const model = toScheduleExceptionModel(dto)

    expect(model.startTime).toBeNull()
    expect(model.endTime).toBeNull()
  })

  it('maps null reason', () => {
    const dto = makeDto({ reason: null })
    const model = toScheduleExceptionModel(dto)

    expect(model.reason).toBeNull()
  })
})
