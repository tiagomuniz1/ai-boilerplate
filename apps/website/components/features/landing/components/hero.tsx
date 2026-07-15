import { CtaLink } from '@/components/ui/atoms/cta-link/cta-link'
import { MediaPlaceholder } from '@/components/ui/atoms/media-placeholder/media-placeholder'
import { REGISTER_URL } from '@/lib/constants'
import { QrPattern } from './qr-pattern'

/** Hero — always dark, with a subtle terracotta diagonal texture. */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-midnight px-10 pb-hero-b pt-section text-warm-white">
      <div
        className="pointer-events-none absolute inset-0 bg-hero-texture opacity-[0.35]"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-content items-center gap-15 md:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="mb-6 inline-block rounded-pill border border-terracotta/40 bg-terracotta/[0.16] px-3.5 py-1.5 text-xs font-semibold tracking-wide text-terracotta-light">
            Feito para clínicas brasileiras
          </div>
          <h1 className="mb-5 text-pretty text-9xl font-bold">
            Gestão clínica com a confiança que a medicina exige.
          </h1>
          <p className="mb-8 max-w-lg text-2xl text-dark-fg-muted">
            Agenda, prontuário eletrônico, receitas e atestados em um só lugar — cada clínica com
            seu próprio espaço, sua marca e seus dados isolados.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <CtaLink href={REGISTER_URL} variant="primary" size="md" data-testid="hero-cta">
              Criar minha clínica grátis
            </CtaLink>
            <CtaLink href="#recursos" variant="outline" size="md">
              Ver recursos
            </CtaLink>
          </div>
          <p className="mt-4 text-xs text-dark-fg-subtle">
            Cadastro em minutos. Sem cartão de crédito.
          </p>
        </div>

        <div className="relative">
          <MediaPlaceholder tone="dark" aspectClassName="aspect-[16/11]" className="shadow-hero">
            [ screenshot do produto ]
            <br />
            dashboard · agenda · KPIs
          </MediaPlaceholder>
          <div className="absolute -bottom-6 -left-6 flex max-w-[280px] items-center gap-3 rounded-xl bg-warm-white p-3.5 shadow-float">
            <QrPattern />
            <span className="text-xs font-semibold leading-tight text-ink">
              Receita autêntica
              <br />
              <span className="text-wine">✓ verificada por QR</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
