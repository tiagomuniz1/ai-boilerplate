import { maskCpf, maskName } from '../services/prescription-mask.util'

describe('maskCpf', () => {
  it('masks all but digits 7-9 for a valid 11-digit CPF', () => {
    expect(maskCpf('12345678901')).toBe('***.***.789-**')
  })

  it('ignores formatting characters and masks correctly', () => {
    expect(maskCpf('123.456.789-01')).toBe('***.***.789-**')
  })

  it('returns *** when CPF does not have exactly 11 digits', () => {
    expect(maskCpf('123')).toBe('***')
    expect(maskCpf('')).toBe('***')
    expect(maskCpf('123456789012')).toBe('***')
  })
})

describe('maskName', () => {
  it('returns first name + last initial for a full name', () => {
    expect(maskName('Maria Santos')).toBe('Maria S.')
  })

  it('uses the last token as the initial for multi-part names', () => {
    expect(maskName('Ana Paula de Souza')).toBe('Ana S.')
  })

  it('appends a dot for a single-word name', () => {
    expect(maskName('Cher')).toBe('Cher.')
  })

  it('trims and collapses extra whitespace', () => {
    expect(maskName('  Maria   Santos  ')).toBe('Maria S.')
  })

  it('returns empty string for an empty name', () => {
    expect(maskName('')).toBe('')
    expect(maskName('   ')).toBe('')
  })
})
