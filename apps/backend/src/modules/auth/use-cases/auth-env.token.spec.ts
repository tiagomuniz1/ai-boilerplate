import { parseTtlToSeconds } from './auth-env.token'

describe('parseTtlToSeconds', () => {
  it('returns value as-is for seconds suffix', () => {
    expect(parseTtlToSeconds('900s')).toBe(900)
  })

  it('converts minutes to seconds', () => {
    expect(parseTtlToSeconds('15m')).toBe(900)
  })

  it('converts hours to seconds', () => {
    expect(parseTtlToSeconds('1h')).toBe(3600)
    expect(parseTtlToSeconds('2h')).toBe(7200)
  })

  it('converts days to seconds', () => {
    expect(parseTtlToSeconds('7d')).toBe(604800)
  })

  it('parses plain numeric string as seconds', () => {
    expect(parseTtlToSeconds('3600')).toBe(3600)
  })
})
