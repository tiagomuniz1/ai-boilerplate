import { DayOfWeek } from '@app/shared'
import { toUpdateScheduleDto } from './to-update-schedule-dto.mapper'

describe('toUpdateScheduleDto', () => {
  it('passes all defined fields through', () => {
    const input = {
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: '10:00',
      endTime: '14:00',
      slotDurationInMinutes: 45,
    }
    const dto = toUpdateScheduleDto(input)

    expect(dto.dayOfWeek).toBe(DayOfWeek.WEDNESDAY)
    expect(dto.startTime).toBe('10:00')
    expect(dto.endTime).toBe('14:00')
    expect(dto.slotDurationInMinutes).toBe(45)
  })

  it('sends null explicitly for validFrom when null is provided', () => {
    const input = { validFrom: null }
    const dto = toUpdateScheduleDto(input)
    expect(dto.validFrom).toBeNull()
  })

  it('sends null explicitly for validUntil when null is provided', () => {
    const input = { validUntil: null }
    const dto = toUpdateScheduleDto(input)
    expect(dto.validUntil).toBeNull()
  })

  it('preserves string values for validFrom and validUntil', () => {
    const input = { validFrom: '2025-01-01', validUntil: '2025-12-31' }
    const dto = toUpdateScheduleDto(input)
    expect(dto.validFrom).toBe('2025-01-01')
    expect(dto.validUntil).toBe('2025-12-31')
  })

  it('passes undefined fields through as undefined', () => {
    const dto = toUpdateScheduleDto({})
    expect(dto.dayOfWeek).toBeUndefined()
    expect(dto.startTime).toBeUndefined()
    expect(dto.endTime).toBeUndefined()
    expect(dto.slotDurationInMinutes).toBeUndefined()
    expect(dto.validFrom).toBeUndefined()
    expect(dto.validUntil).toBeUndefined()
  })
})
