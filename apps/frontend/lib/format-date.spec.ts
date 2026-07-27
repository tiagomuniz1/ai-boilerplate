import { formatDateToBR, toLocalDateString } from './format-date'

describe('formatDateToBR', () => {
  it('formats a YYYY-MM-DD string into DD/MM/YYYY', () => {
    expect(formatDateToBR('2026-07-10')).toBe('10/07/2026')
  })

  it('formats a full ISO string by using only the date part', () => {
    expect(formatDateToBR('2026-07-10T13:45:00.000Z')).toBe('10/07/2026')
  })

  it('returns the original string when it does not match the expected shape', () => {
    expect(formatDateToBR('10/07/2026')).toBe('10/07/2026')
    expect(formatDateToBR('')).toBe('')
  })
})

describe('toLocalDateString', () => {
  it('formats a Date into YYYY-MM-DD using local calendar fields', () => {
    expect(toLocalDateString(new Date(2026, 6, 10))).toBe('2026-07-10')
  })

  it('pads single-digit month and day', () => {
    expect(toLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('does not shift the date near midnight regardless of the time component', () => {
    const lateNight = new Date(2026, 6, 10, 23, 59, 0)
    expect(toLocalDateString(lateNight)).toBe('2026-07-10')
  })
})
