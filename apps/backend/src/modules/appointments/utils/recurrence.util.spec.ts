import { DayOfWeek, MAXIMUM_RECURRING_OCCURRENCES } from '@app/shared'
import {
  addDaysUtc,
  differenceInDays,
  generateRecurringDates,
  getDayOfWeekFromDate,
  isOnRecurrenceGrid,
} from './recurrence.util'

describe('recurrence.util', () => {
  describe('addDaysUtc', () => {
    it('adds days within the same month', () => {
      expect(addDaysUtc('2026-09-01', 7)).toBe('2026-09-08')
    })

    it('crosses the month boundary', () => {
      expect(addDaysUtc('2026-01-29', 7)).toBe('2026-02-05')
    })

    it('crosses the year boundary', () => {
      expect(addDaysUtc('2026-12-31', 7)).toBe('2027-01-07')
    })

    it('handles February in a leap year', () => {
      expect(addDaysUtc('2028-02-24', 7)).toBe('2028-03-02')
    })

    it('supports a zero offset', () => {
      expect(addDaysUtc('2026-09-01', 0)).toBe('2026-09-01')
    })
  })

  describe('differenceInDays', () => {
    it('counts forward', () => {
      expect(differenceInDays('2026-09-01', '2026-09-15')).toBe(14)
    })

    it('counts backward as negative', () => {
      expect(differenceInDays('2026-09-15', '2026-09-01')).toBe(-14)
    })

    it('returns zero for the same date', () => {
      expect(differenceInDays('2026-09-01', '2026-09-01')).toBe(0)
    })
  })

  describe('getDayOfWeekFromDate', () => {
    it.each([
      ['2026-09-06', DayOfWeek.SUNDAY],
      ['2026-09-07', DayOfWeek.MONDAY],
      ['2026-09-08', DayOfWeek.TUESDAY],
      ['2026-09-09', DayOfWeek.WEDNESDAY],
      ['2026-09-10', DayOfWeek.THURSDAY],
      ['2026-09-11', DayOfWeek.FRIDAY],
      ['2026-09-12', DayOfWeek.SATURDAY],
    ])('maps %s to %s', (date, expected) => {
      expect(getDayOfWeekFromDate(date)).toBe(expected)
    })
  })

  describe('isOnRecurrenceGrid', () => {
    it('accepts the anchor itself', () => {
      expect(isOnRecurrenceGrid('2026-09-08', '2026-09-08', 1)).toBe(true)
    })

    it('accepts a weekly repetition', () => {
      expect(isOnRecurrenceGrid('2026-09-08', '2026-09-22', 1)).toBe(true)
    })

    it('rejects a date off the fortnightly grid', () => {
      expect(isOnRecurrenceGrid('2026-09-08', '2026-09-15', 2)).toBe(false)
    })

    it('accepts a date on the fortnightly grid', () => {
      expect(isOnRecurrenceGrid('2026-09-08', '2026-09-22', 2)).toBe(true)
    })

    it('rejects a date before the anchor', () => {
      expect(isOnRecurrenceGrid('2026-09-08', '2026-09-01', 1)).toBe(false)
    })

    it('rejects a date on a different weekday', () => {
      expect(isOnRecurrenceGrid('2026-09-08', '2026-09-16', 1)).toBe(false)
    })
  })

  describe('generateRecurringDates', () => {
    it('generates weekly occurrences from the anchor', () => {
      const result = generateRecurringDates({
        anchorDate: '2026-09-08',
        intervalInWeeks: 1,
        occurrenceCount: 4,
      })

      expect(result.dates).toEqual(['2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29'])
      expect(result.truncatedByMaximumOccurrences).toBe(false)
      expect(result.truncatedByHorizon).toBe(false)
    })

    it('generates fortnightly occurrences', () => {
      const result = generateRecurringDates({
        anchorDate: '2026-09-08',
        intervalInWeeks: 2,
        occurrenceCount: 3,
      })

      expect(result.dates).toEqual(['2026-09-08', '2026-09-22', '2026-10-06'])
    })

    it('generates occurrences every four weeks', () => {
      const result = generateRecurringDates({
        anchorDate: '2026-09-08',
        intervalInWeeks: 4,
        occurrenceCount: 3,
      })

      expect(result.dates).toEqual(['2026-09-08', '2026-10-06', '2026-11-03'])
    })

    it('crosses a month with five weeks keeping the weekday', () => {
      const result = generateRecurringDates({
        anchorDate: '2026-01-29',
        intervalInWeeks: 1,
        occurrenceCount: 6,
      })

      expect(result.dates).toEqual([
        '2026-01-29',
        '2026-02-05',
        '2026-02-12',
        '2026-02-19',
        '2026-02-26',
        '2026-03-05',
      ])
      expect(result.dates.every((date) => getDayOfWeekFromDate(date) === DayOfWeek.THURSDAY)).toBe(true)
    })

    it('crosses the year boundary', () => {
      const result = generateRecurringDates({
        anchorDate: '2026-12-31',
        intervalInWeeks: 1,
        occurrenceCount: 2,
      })

      expect(result.dates).toEqual(['2026-12-31', '2027-01-07'])
    })

    it('handles a leap-year February', () => {
      const result = generateRecurringDates({
        anchorDate: '2028-02-24',
        intervalInWeeks: 1,
        occurrenceCount: 2,
      })

      expect(result.dates).toEqual(['2028-02-24', '2028-03-02'])
    })

    it('stops on untilDate when it comes before the occurrence count', () => {
      const result = generateRecurringDates({
        anchorDate: '2026-09-08',
        intervalInWeeks: 1,
        occurrenceCount: 10,
        untilDate: '2026-09-23',
      })

      expect(result.dates).toEqual(['2026-09-08', '2026-09-15', '2026-09-22'])
    })

    it('stops on the occurrence count when it comes before untilDate', () => {
      const result = generateRecurringDates({
        anchorDate: '2026-09-08',
        intervalInWeeks: 1,
        occurrenceCount: 2,
        untilDate: '2026-12-31',
      })

      expect(result.dates).toEqual(['2026-09-08', '2026-09-15'])
    })

    it('includes an untilDate that falls exactly on an occurrence', () => {
      const result = generateRecurringDates({
        anchorDate: '2026-09-08',
        intervalInWeeks: 1,
        untilDate: '2026-09-22',
      })

      expect(result.dates).toEqual(['2026-09-08', '2026-09-15', '2026-09-22'])
    })

    it('returns an empty list when untilDate precedes the anchor', () => {
      const result = generateRecurringDates({
        anchorDate: '2026-09-08',
        intervalInWeeks: 1,
        untilDate: '2026-09-01',
      })

      expect(result.dates).toEqual([])
      expect(result.truncatedByMaximumOccurrences).toBe(false)
      expect(result.truncatedByHorizon).toBe(false)
    })

    it('flags truncation at the maximum occurrence count', () => {
      const result = generateRecurringDates({
        anchorDate: '2026-09-08',
        intervalInWeeks: 1,
        untilDate: '2027-09-08',
      })

      expect(result.dates).toHaveLength(MAXIMUM_RECURRING_OCCURRENCES)
      expect(result.truncatedByMaximumOccurrences).toBe(true)
      expect(result.truncatedByHorizon).toBe(false)
    })

    it('flags truncation at the one-year horizon before the occurrence cap', () => {
      const result = generateRecurringDates({
        anchorDate: '2026-09-08',
        intervalInWeeks: 4,
        untilDate: '2029-09-08',
      })

      expect(result.dates).toHaveLength(14)
      expect(result.dates[13]).toBe('2027-09-07')
      expect(result.truncatedByHorizon).toBe(true)
      expect(result.truncatedByMaximumOccurrences).toBe(false)
    })
  })
})
