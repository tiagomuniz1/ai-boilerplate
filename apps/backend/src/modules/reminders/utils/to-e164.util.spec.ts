import { toE164BrazilPhone } from './to-e164.util'

describe('toE164BrazilPhone', () => {
  it('returns null for empty / nullish / non-digit input', () => {
    expect(toE164BrazilPhone(null)).toBeNull()
    expect(toE164BrazilPhone(undefined)).toBeNull()
    expect(toE164BrazilPhone('')).toBeNull()
    expect(toE164BrazilPhone('abc')).toBeNull()
  })

  it('adds +55 to an 11-digit mobile national number', () => {
    expect(toE164BrazilPhone('11998765432')).toBe('+5511998765432')
  })

  it('adds +55 to a 10-digit landline national number', () => {
    expect(toE164BrazilPhone('1132654321')).toBe('+551132654321')
  })

  it('strips separators/mask before normalizing', () => {
    expect(toE164BrazilPhone('(11) 99876-5432')).toBe('+5511998765432')
    expect(toE164BrazilPhone('+55 11 99876-5432')).toBe('+5511998765432')
  })

  it('keeps an already-prefixed +55 number', () => {
    expect(toE164BrazilPhone('5511998765432')).toBe('+5511998765432')
  })

  it('drops a leading 00 international trunk prefix', () => {
    expect(toE164BrazilPhone('005511998765432')).toBe('+5511998765432')
  })

  it('returns null for a national number of implausible length', () => {
    expect(toE164BrazilPhone('123')).toBeNull()
    expect(toE164BrazilPhone('999999999999')).toBeNull() // 12 digits, no 55 prefix
  })

  it('returns null when the +55 number has the wrong total length', () => {
    expect(toE164BrazilPhone('55119')).toBeNull()
    expect(toE164BrazilPhone('55119987654321')).toBeNull() // 14 digits
  })

  it('returns null for an invalid DDD (leading zero)', () => {
    expect(toE164BrazilPhone('5501998765432')).toBeNull()
  })
})
