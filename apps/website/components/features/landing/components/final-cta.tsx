import { CtaLink } from '@/components/ui/atoms/cta-link/cta-link'
import { REGISTER_URL } from '@/lib/constants'

/** Closing CTA — solid wine, always fixed by brand identity. */
export function FinalCta() {
  return (
    <section className="bg-wine px-10 py-section text-center text-warm-white">
      <div className="mx-auto max-w-prose-lg">
        <h2 className="mb-4 text-pretty text-8xl font-bold">
          Sua clínica organizada, seus dados seguros. Comece agora.
        </h2>
        <p className="mb-8 text-xl text-wine-soft">
          Crie sua clínica gratuitamente e veja o Pulso funcionando com o seu primeiro paciente.
        </p>
        <CtaLink href={REGISTER_URL} variant="white" size="lg" data-testid="final-cta">
          Criar minha clínica grátis
        </CtaLink>
        <p className="mt-4 text-xs text-wine-faint">
          Sem cartão de crédito · Configuração em minutos
        </p>
      </div>
    </section>
  )
}
