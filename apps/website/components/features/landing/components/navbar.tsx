import { Logo } from '@/components/ui/atoms/logo/logo'
import { ThemeToggle } from '@/components/ui/atoms/theme-toggle/theme-toggle'
import { NAV_LINKS } from '@/lib/constants'
import { RequestAccessCta } from './request-access-cta'

/** Sticky top navbar — always dark by brand identity. */
export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/[0.08] bg-midnight px-10 py-4">
      <Logo size="md" />
      <div className="flex flex-wrap items-center gap-4 md:gap-7">
        <div className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-base text-dark-fg-dim transition-colors hover:text-terracotta"
            >
              {link.label}
            </a>
          ))}
        </div>
        <ThemeToggle />
        <RequestAccessCta variant="primary" size="sm" data-testid="nav-cta">
          Solicitar acesso
        </RequestAccessCta>
      </div>
    </nav>
  )
}
