import { NAV_LINKS, REGISTER_URL } from './constants'

describe('constants', () => {
  it('exposes a register URL (falls back to staging without env override)', () => {
    expect(REGISTER_URL).toBe('https://staging.pulso.center')
  })

  it('lists the four navbar anchor links', () => {
    expect(NAV_LINKS).toHaveLength(4)
    expect(NAV_LINKS.map((l) => l.href)).toEqual([
      '#recursos',
      '#seguranca',
      '#como-funciona',
      '#perguntas',
    ])
  })

  it('gives every nav link a label', () => {
    NAV_LINKS.forEach((link) => {
      expect(link.label.length).toBeGreaterThan(0)
    })
  })
})
