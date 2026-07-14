import { extractSlugFromSubdomain, getBaseDomain, isSubdomainMode } from './subdomain'

describe('subdomain helpers', () => {
  const original = process.env.NEXT_PUBLIC_BASE_DOMAIN

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_BASE_DOMAIN
    else process.env.NEXT_PUBLIC_BASE_DOMAIN = original
  })

  describe('path-mode (no base domain)', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_BASE_DOMAIN
    })

    it('getBaseDomain returns undefined', () => {
      expect(getBaseDomain()).toBeUndefined()
    })

    it('isSubdomainMode is false', () => {
      expect(isSubdomainMode()).toBe(false)
    })

    it('extractSlugFromSubdomain returns null regardless of hostname', () => {
      expect(extractSlugFromSubdomain('clinica-a.pulso.center')).toBeNull()
    })

    it('treats an empty string base domain as path-mode', () => {
      process.env.NEXT_PUBLIC_BASE_DOMAIN = ''
      expect(isSubdomainMode()).toBe(false)
      expect(extractSlugFromSubdomain('clinica-a.pulso.center')).toBeNull()
    })
  })

  describe('subdomain-mode', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_BASE_DOMAIN = 'pulso.center'
    })

    it('getBaseDomain returns the configured domain', () => {
      expect(getBaseDomain()).toBe('pulso.center')
    })

    it('isSubdomainMode is true', () => {
      expect(isSubdomainMode()).toBe(true)
    })

    it('extracts a clinic slug from the subdomain', () => {
      expect(extractSlugFromSubdomain('clinica-a.pulso.center')).toBe('clinica-a')
    })

    it('extracts the backoffice subdomain', () => {
      expect(extractSlugFromSubdomain('backoffice.pulso.center')).toBe('backoffice')
    })

    it('returns null on the apex domain', () => {
      expect(extractSlugFromSubdomain('pulso.center')).toBeNull()
    })

    it('returns null on www', () => {
      expect(extractSlugFromSubdomain('www.pulso.center')).toBeNull()
    })

    it('returns null for an unrelated host', () => {
      expect(extractSlugFromSubdomain('example.com')).toBeNull()
    })
  })
})
