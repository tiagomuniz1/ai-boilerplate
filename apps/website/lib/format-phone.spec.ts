import { applyPhoneMask } from './format-phone'

describe('applyPhoneMask', () => {
  it('returns empty string for empty input', () => {
    expect(applyPhoneMask('')).toBe('')
  })

  it('formats 1-2 digits as area code opening', () => {
    expect(applyPhoneMask('1')).toBe('(1')
    expect(applyPhoneMask('11')).toBe('(11')
  })

  it('formats 3-6 digits with area code and number start', () => {
    expect(applyPhoneMask('119')).toBe('(11) 9')
    expect(applyPhoneMask('119999')).toBe('(11) 9999')
  })

  it('formats 7-10 digits as landline pattern (XX) XXXX-XXXX', () => {
    expect(applyPhoneMask('1133334444')).toBe('(11) 3333-4444')
    expect(applyPhoneMask('119876543')).toBe('(11) 9876-543')
  })

  it('formats 11 digits as mobile pattern (XX) XXXXX-XXXX', () => {
    expect(applyPhoneMask('11999994444')).toBe('(11) 99999-4444')
    expect(applyPhoneMask('11987654321')).toBe('(11) 98765-4321')
  })

  it('strips non-digit characters before masking', () => {
    expect(applyPhoneMask('(11) 99999-9999')).toBe('(11) 99999-9999')
    expect(applyPhoneMask('11.99999.9999')).toBe('(11) 99999-9999')
  })

  it('limits output to 11 digits', () => {
    expect(applyPhoneMask('119999999999999')).toBe('(11) 99999-9999')
  })
})
