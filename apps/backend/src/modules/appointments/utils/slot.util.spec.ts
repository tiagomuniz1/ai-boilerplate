import { generateSlots, isSlotBlockedByExceptions, minutesToTime, timeToMinutes } from './slot.util'
import { Schedule } from '../../schedules/entities/schedule.entity'

const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule =>
  ({
    id: 'schedule-1',
    startTime: '08:00',
    endTime: '10:00',
    slotDurationInMinutes: 30,
    ...overrides,
  }) as Schedule

describe('slot.util', () => {
  describe('timeToMinutes / minutesToTime', () => {
    it('converts time to minutes', () => {
      expect(timeToMinutes('08:30')).toBe(510)
      expect(timeToMinutes('00:00')).toBe(0)
    })

    it('converts minutes to zero-padded time', () => {
      expect(minutesToTime(510)).toBe('08:30')
      expect(minutesToTime(0)).toBe('00:00')
      expect(minutesToTime(9 * 60 + 5)).toBe('09:05')
    })
  })

  describe('generateSlots', () => {
    it('generates evenly spaced slots within working hours', () => {
      const slots = generateSlots(makeSchedule())
      expect(slots).toEqual([
        { startTime: '08:00', endTime: '08:30', scheduleId: 'schedule-1', slotDurationInMinutes: 30 },
        { startTime: '08:30', endTime: '09:00', scheduleId: 'schedule-1', slotDurationInMinutes: 30 },
        { startTime: '09:00', endTime: '09:30', scheduleId: 'schedule-1', slotDurationInMinutes: 30 },
        { startTime: '09:30', endTime: '10:00', scheduleId: 'schedule-1', slotDurationInMinutes: 30 },
      ])
    })

    it('does not emit a slot that would overflow the end time', () => {
      const slots = generateSlots(makeSchedule({ startTime: '08:00', endTime: '08:50', slotDurationInMinutes: 30 }))
      expect(slots).toEqual([
        { startTime: '08:00', endTime: '08:30', scheduleId: 'schedule-1', slotDurationInMinutes: 30 },
      ])
    })
  })

  describe('isSlotBlockedByExceptions', () => {
    const slot = { startTime: '09:00', endTime: '09:30' }

    it('returns false when there are no exceptions', () => {
      expect(isSlotBlockedByExceptions(slot, [])).toBe(false)
    })

    it('returns true when a full-day exception (null start/end) blocks the slot', () => {
      expect(isSlotBlockedByExceptions(slot, [{ startTime: null, endTime: null }])).toBe(true)
    })

    it('returns true when the slot overlaps a timed exception window', () => {
      expect(isSlotBlockedByExceptions(slot, [{ startTime: '09:15', endTime: '10:00' }])).toBe(true)
    })

    it('returns false when the slot is entirely outside the exception window', () => {
      expect(isSlotBlockedByExceptions(slot, [{ startTime: '10:00', endTime: '11:00' }])).toBe(false)
    })

    it('treats a null start as start-of-day and null end as end-of-day', () => {
      expect(isSlotBlockedByExceptions(slot, [{ startTime: null, endTime: '09:15' }])).toBe(true)
      expect(isSlotBlockedByExceptions(slot, [{ startTime: '09:15', endTime: null }])).toBe(true)
    })
  })
})
