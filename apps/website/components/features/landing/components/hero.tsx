import { CtaLink } from '@/components/ui/atoms/cta-link/cta-link'
import { ScreenshotImage } from '@/components/ui/molecules/screenshot-image/screenshot-image'
import { RequestAccessCta } from './request-access-cta'
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
          <h1 className="mb-5 text-pretty text-9xl font-bold">
            Gestão clínica com a confiança que a medicina exige.
          </h1>
          <p className="mb-8 max-w-lg text-2xl text-dark-fg-muted">
            Agenda, prontuário eletrônico, receitas e atestados em um só lugar — cada clínica com
            seu próprio espaço, sua marca e seus dados isolados.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <RequestAccessCta variant="primary" size="md" data-testid="hero-cta">
              Solicitar acesso ao sistema
            </RequestAccessCta>
            <CtaLink href="#recursos" variant="outline" size="md">
              Ver recursos
            </CtaLink>
          </div>
          <p className="mt-4 text-xs text-dark-fg-subtle">
            Acesso mediante aprovação. Sem cadastro aberto.
          </p>
        </div>

        <div className="relative">
          <ScreenshotImage
            src="/screenshots/agenda.png"
            alt="Agenda semanal do Pulso, com as consultas de cada médico organizadas por dia e status."
            width={2930}
            height={1596}
            priority
            className="w-full rounded-3xl border border-white/[0.12] shadow-hero"
          />
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
