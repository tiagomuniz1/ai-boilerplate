import { formatDateToBR } from './format-date'

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
