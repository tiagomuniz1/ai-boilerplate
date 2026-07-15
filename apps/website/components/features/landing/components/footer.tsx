import { Logo } from '@/components/ui/atoms/logo/logo'

interface IFooterLink {
  href: string
  label: string
}

const PRODUCT_LINKS: readonly IFooterLink[] = [
  { href: '#recursos', label: 'Recursos' },
  { href: '#seguranca', label: 'Segurança' },
]

const SUPPORT_LINKS: readonly IFooterLink[] = [
  { href: '#perguntas', label: 'Perguntas frequentes' },
  { href: 'mailto:contato@pulso.center', label: 'Contato' },
]

function FooterColumn({ title, links }: { title: string; links: readonly IFooterLink[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="mb-1 text-2xs font-bold tracking-wider text-dark-fg-muted">{title}</span>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="text-sm text-dark-fg-faint transition-colors hover:text-terracotta"
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

/** Footer — always dark by brand identity. */
export function Footer() {
  return (
    <footer className="bg-midnight px-10 pb-8 pt-14 text-dark-fg-faint">
      <div className="mx-auto max-w-content">
        <div className="mb-8 flex flex-wrap justify-between gap-8">
          <div>
            <Logo size="sm" className="mb-2.5" />
            <p className="max-w-[220px] text-xs text-dark-fg-tagline">
              Pulso — sistema de gestão para clínicas.
            </p>
          </div>
          <div className="flex flex-wrap gap-14">
            <FooterColumn title="PRODUTO" links={PRODUCT_LINKS} />
            <FooterColumn title="SUPORTE" links={SUPPORT_LINKS} />
          </div>
        </div>
        <div className="border-t border-white/[0.08] pt-5 text-xs text-dark-fg-copyright">
          © Pulso. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  )
}
