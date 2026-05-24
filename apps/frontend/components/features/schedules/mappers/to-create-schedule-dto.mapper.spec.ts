import { DayOfWeek } from '@app/shared'
import { toCreateScheduleDto } from './to-create-schedule-dto.mapper'

describe('toCreateScheduleDto', () => {
  it('maps required fields correctly', () => {
    const input = {
      dayOfWeek: DayOfWeek.FRIDAY,
      startTime: '09:00',
      endTime: '13:00',
      slotDurationInMinutes: 60,
    }
    const dto = toCreateScheduleDto(input)

    expect(dto.dayOfWeek).toBe(DayOfWeek.FRIDAY)
    expect(dto.startTime).toBe('09:00')
    expect(dto.endTime).toBe('13:00')
    expect(dto.slotDurationInMinutes).toBe(60)
  })

  it('includes doctorId when provided', () => {
    const input = {
      doctorId: 'doc-uuid',
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '08:00',
      endTime: '12:00',
      slotDurationInMinutes: 30,
    }
    const dto = toCreateScheduleDto(input)
    expect(dto.doctorId).toBe('doc-uuid')
  })

  it('does not include doctorId when undefined', () => {
    const input = {
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '08:00',
      endTime: '12:00',
      slotDurationInMinutes: 30,
    }
    const dto = toCreateScheduleDto(input)
    expect(dto.doctorId).toBeUndefined()
  })

  it('converts empty string validFrom to undefined', () => {
    const input = {
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '08:00',
      endTime: '12:00',
      slotDurationInMinutes: 30,
      validFrom: '',
    }
    const dto = toCreateScheduleDto(input)
    expect(dto.validFrom).toBeUndefined()
  })

  it('converts empty string validUntil to undefined', () => {
    const input = {
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '08:00',
      endTime: '12:00',
      slotDurationInMinutes: 30,
      validUntil: '',
    }
    const dto = toCreateScheduleDto(input)
    expect(dto.validUntil).toBeUndefined()
  })

  it('preserves non-empty validFrom and validUntil', () => {
    const input = {
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '08:00',
      endTime: '12:00',
      slotDurationInMinutes: 30,
      validFrom: '2025-06-01',
      validUntil: '2025-12-31',
    }
    const dto = toCreateScheduleDto(input)
    expect(dto.validFrom).toBe('2025-06-01')
    expect(dto.validUntil).toBe('2025-12-31')
  })
})
