import { RequestAccessCta } from './request-access-cta'

/** Closing CTA — solid wine, always fixed by brand identity. */
export function FinalCta() {
  return (
    <section className="bg-wine px-10 py-section text-center text-warm-white">
      <div className="mx-auto max-w-prose-lg">
        <h2 className="mb-4 text-pretty text-8xl font-bold">
          Sua clínica organizada, seus dados seguros. Comece agora.
        </h2>
        <p className="mb-8 text-xl text-wine-soft">
          Solicite acesso e veja o Pulso funcionando com o seu primeiro paciente.
        </p>
        <RequestAccessCta variant="white" size="lg" data-testid="final-cta">
          Solicitar acesso ao sistema
        </RequestAccessCta>
        <p className="mt-4 text-xs text-wine-faint">Acesso mediante aprovação prévia</p>
      </div>
    </section>
  )
}
