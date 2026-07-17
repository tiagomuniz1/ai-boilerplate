import { API_URL, NAV_LINKS } from './constants'

describe('constants', () => {
  it('exposes an API URL (falls back to staging without env override)', () => {
    expect(API_URL).toBe('https://api.staging.pulso.center')
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
