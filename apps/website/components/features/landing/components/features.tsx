import { FeatureCard } from '@/components/ui/molecules/feature-card/feature-card'
import { FEATURES } from '../constants/landing-content'

/** Recursos — content section (flips with the theme toggle). */
export function Features() {
  return (
    <section id="recursos" className="bg-content-bg px-10 py-section text-content-text">
      <div className="mx-auto max-w-content">
        <div className="mx-auto mb-14 max-w-prose text-center">
          <h2 className="mb-3.5 text-pretty text-8xl font-bold">
            Tudo que a clínica precisa, sem sistemas soltos.
          </h2>
          <p className="text-lg text-content-mute">
            Um núcleo integrado que acompanha o paciente do agendamento à receita.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard
              key={feature.number}
              number={feature.number}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
