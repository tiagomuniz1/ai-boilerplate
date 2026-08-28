import { getEnvConfig } from '../../config/env.config'

/**
 * Builds an absolute URL to a page inside a clinic's own frontend.
 *
 * Production serves each clinic from its own subdomain (`pulso.pulso.center`)
 * and the frontend middleware derives the slug from the Host header, so the
 * slug must NOT also appear in the path. Local path-mode has no subdomains and
 * the slug is the first path segment instead.
 *
 * `COOKIE_DOMAIN` is the signal that distinguishes the two: it is set exactly
 * when cookies are shared across clinic subdomains (`.pulso.center` in
 * production, `.pulso.localhost` in the full local stack) and unset in
 * path-mode. It mirrors the frontend's own `NEXT_PUBLIC_BASE_DOMAIN`.
 *
 * Getting this wrong is not a cosmetic bug: `FRONTEND_URL` points at the
 * backoffice host, so a path-mode link built in production lands on
 * `backoffice.pulso.center/<slug>/...`, where the middleware reads the slug as
 * `backoffice`, stops treating the route as public, and sends the visitor to a
 * login page they have no account for.
 *
 * @param slug clinic slug
 * @param path absolute path inside the clinic app, starting with `/`
 */
export function buildClinicUrl(slug: string, path: string): string {
  const { COOKIE_DOMAIN, FRONTEND_URL } = getEnvConfig()

  if (COOKIE_DOMAIN) {
    const baseDomain = COOKIE_DOMAIN.replace(/^\./, '')
    const protocol = FRONTEND_URL.startsWith('http://') ? 'http' : 'https'
    return `${protocol}://${slug}.${baseDomain}${path}`
  }

  return `${FRONTEND_URL}/${slug}${path}`
}
