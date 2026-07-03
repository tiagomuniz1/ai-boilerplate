import { calculateAge } from './calculate-age'

describe('calculateAge', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns the full age when the birthday already happened this year', () => {
    expect(calculateAge(new Date(2000, 0, 1))).toBe(26)
  })

  it('subtracts one year when the birth month has not arrived yet this year', () => {
    expect(calculateAge(new Date(2000, 11, 1))).toBe(25)
  })

  it('subtracts one year when in the birth month but the day has not arrived yet', () => {
    expect(calculateAge(new Date(2000, 5, 20))).toBe(25)
  })

  it('returns the full age when today is exactly the birthday', () => {
    expect(calculateAge(new Date(2000, 5, 15))).toBe(26)
  })

  it('returns the full age when in the birth month and the day already passed', () => {
    expect(calculateAge(new Date(2000, 5, 10))).toBe(26)
  })
})
