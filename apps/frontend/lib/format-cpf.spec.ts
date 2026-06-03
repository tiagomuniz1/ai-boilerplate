import { applyCpfMask, formatCpf } from './format-cpf'

describe('applyCpfMask', () => {
  it('returns empty string for empty input', () => {
    expect(applyCpfMask('')).toBe('')
  })

  it('formats 1-3 digits without separators', () => {
    expect(applyCpfMask('1')).toBe('1')
    expect(applyCpfMask('12')).toBe('12')
    expect(applyCpfMask('123')).toBe('123')
  })

  it('adds first dot after 3 digits', () => {
    expect(applyCpfMask('1234')).toBe('123.4')
    expect(applyCpfMask('123456')).toBe('123.456')
  })

  it('adds second dot after 6 digits', () => {
    expect(applyCpfMask('1234567')).toBe('123.456.7')
    expect(applyCpfMask('123456789')).toBe('123.456.789')
  })

  it('adds hyphen after 9 digits', () => {
    expect(applyCpfMask('1234567890')).toBe('123.456.789-0')
    expect(applyCpfMask('12345678901')).toBe('123.456.789-01')
  })

  it('strips non-digit characters before masking', () => {
    expect(applyCpfMask('123.456.789-01')).toBe('123.456.789-01')
    expect(applyCpfMask('12345678901abc')).toBe('123.456.789-01')
  })

  it('limits output to 11 digits', () => {
    expect(applyCpfMask('123456789012345')).toBe('123.456.789-01')
  })
})

describe('formatCpf', () => {
  it('returns empty string for empty input', () => {
    expect(formatCpf('')).toBe('')
  })

  it('formats 11 digits as XXX.XXX.XXX-XX', () => {
    expect(formatCpf('12345678901')).toBe('123.456.789-01')
    expect(formatCpf('98765432100')).toBe('987.654.321-00')
  })

  it('returns raw string for unexpected lengths', () => {
    expect(formatCpf('1234')).toBe('1234')
    expect(formatCpf('123456789012')).toBe('123456789012')
  })

  it('strips any mask before formatting', () => {
    expect(formatCpf('123.456.789-01')).toBe('123.456.789-01')
  })
})
