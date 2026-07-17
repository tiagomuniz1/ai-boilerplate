// Shared subdomain helpers used by both the middleware (edge) and the api-client
// (browser). NEXT_PUBLIC_BASE_DOMAIN is inlined at build time; it is set in prod
// (e.g. `pulso.center`, enabling subdomain-mode) and empty in local dev (path-mode).
// Read per-call so the value stays easy to exercise in tests.

export function getBaseDomain(): string | undefined {
  return process.env.NEXT_PUBLIC_BASE_DOMAIN || undefined
}

export function isSubdomainMode(): boolean {
  return Boolean(getBaseDomain())
}

// Derives the clinic slug from the hostname in subdomain-mode.
//   clinica-a.pulso.center → 'clinica-a'
//   backoffice.pulso.center → 'backoffice'
//   pulso.center / www.pulso.center → null (apex, no clinic)
// Returns null in path-mode (no base domain) — callers fall back to the path.
export function extractSlugFromSubdomain(hostname: string): string | null {
  const baseDomain = getBaseDomain()
  if (!baseDomain) return null
  if (hostname === baseDomain || hostname === `www.${baseDomain}`) return null
  if (hostname.endsWith(`.${baseDomain}`)) {
    return hostname.slice(0, hostname.length - baseDomain.length - 1)
  }
  return null
}

// Builds the URL to a clinic's own system from its slug, mirroring how the app
// resolves the clinic at runtime:
//   subdomain-mode (prod): absolute cross-origin URL `https://<slug>.<baseDomain>`
//   path-mode (local dev): relative path `/<slug>` on the current host
export function buildClinicSystemUrl(slug: string): string {
  const baseDomain = getBaseDomain()
  if (!baseDomain) return `/${slug}`
  return `https://${slug}.${baseDomain}`
}
