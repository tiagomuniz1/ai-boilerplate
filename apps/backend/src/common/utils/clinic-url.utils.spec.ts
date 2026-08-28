import { buildClinicUrl } from './clinic-url.utils'
import { getEnvConfig } from '../../config/env.config'

jest.mock('../../config/env.config', () => ({
  getEnvConfig: jest.fn(),
}))

const mockGetEnvConfig = getEnvConfig as jest.Mock

describe('buildClinicUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('subdomain-mode (COOKIE_DOMAIN set)', () => {
    it('puts the slug in the host and never in the path', () => {
      mockGetEnvConfig.mockReturnValue({
        COOKIE_DOMAIN: '.pulso.center',
        FRONTEND_URL: 'https://backoffice.pulso.center',
      })

      const url = buildClinicUrl('pulso', '/verify/prescriptions/abc123')

      expect(url).toBe('https://pulso.pulso.center/verify/prescriptions/abc123')
      // The regression this guards: FRONTEND_URL points at the backoffice, and a
      // slug in the path makes the middleware read "backoffice" as the clinic and
      // stop treating /verify as public.
      expect(url).not.toContain('backoffice')
      expect(url).not.toContain('/pulso/verify')
    })

    it('ignores a COOKIE_DOMAIN written without the leading dot', () => {
      mockGetEnvConfig.mockReturnValue({
        COOKIE_DOMAIN: 'pulso.center',
        FRONTEND_URL: 'https://backoffice.pulso.center',
      })

      expect(buildClinicUrl('clinica-a', '/set-password?token=t')).toBe(
        'https://clinica-a.pulso.center/set-password?token=t',
      )
    })

    it('keeps http for the local full stack, which has no certificate', () => {
      mockGetEnvConfig.mockReturnValue({
        COOKIE_DOMAIN: '.pulso.localhost',
        FRONTEND_URL: 'http://backoffice.pulso.localhost:3010',
      })

      expect(buildClinicUrl('pulso', '/verify/prescriptions/abc')).toBe(
        'http://pulso.pulso.localhost/verify/prescriptions/abc',
      )
    })
  })

  describe('path-mode (COOKIE_DOMAIN unset)', () => {
    it('falls back to the slug as the first path segment', () => {
      mockGetEnvConfig.mockReturnValue({
        COOKIE_DOMAIN: undefined,
        FRONTEND_URL: 'http://localhost:3000',
      })

      expect(buildClinicUrl('pulso', '/verify/prescriptions/abc123')).toBe(
        'http://localhost:3000/pulso/verify/prescriptions/abc123',
      )
    })

    it('treats an empty COOKIE_DOMAIN as path-mode', () => {
      mockGetEnvConfig.mockReturnValue({
        COOKIE_DOMAIN: '',
        FRONTEND_URL: 'http://localhost:3000',
      })

      expect(buildClinicUrl('pulso', '/set-password?token=t')).toBe(
        'http://localhost:3000/pulso/set-password?token=t',
      )
    })
  })
})
