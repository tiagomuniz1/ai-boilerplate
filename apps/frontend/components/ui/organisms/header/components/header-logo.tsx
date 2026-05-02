'use client'

import Link from 'next/link'

export interface IHeaderLogoProps {
  onClick?: () => void
}

export function HeaderLogo({ onClick }: IHeaderLogoProps) {
  return (
    <Link
      href="/"
      onClick={onClick}
      data-testid="header-logo"
      aria-label="Ir para o início"
      className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
    >
      <div
        className="w-8 h-8 rounded-lg grid place-items-center text-sm font-semibold shrink-0"
        style={{
          background: 'linear-gradient(155deg, var(--accent), var(--warm))',
          color: '#0B1220',
        }}
      >
        U
      </div>
    </Link>
  )
}
