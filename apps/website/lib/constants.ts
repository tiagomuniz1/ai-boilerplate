/** Base URL of the Pulso API — used to submit "solicitar acesso" requests. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.pulso.center'

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
