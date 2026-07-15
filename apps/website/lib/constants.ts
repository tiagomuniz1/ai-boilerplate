/**
 * Public destination for every "Criar clínica grátis" CTA — the clinic self-service
 * registration flow (backed by `POST /clinics/register`). Configurable at build time via
 * `NEXT_PUBLIC_REGISTER_URL`; falls back to the staging environment.
 */
export const REGISTER_URL =
  process.env.NEXT_PUBLIC_REGISTER_URL || 'https://staging.pulso.center'

export interface INavLink {
  href: string
  label: string
}

/** Anchor links shared by the navbar and footer. */
export const NAV_LINKS: readonly INavLink[] = [
  { href: '#recursos', label: 'Recursos' },
  { href: '#seguranca', label: 'Segurança' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#perguntas', label: 'Perguntas' },
]
