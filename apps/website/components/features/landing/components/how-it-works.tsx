import { StepCard } from '@/components/ui/molecules/step-card/step-card'
import { RequestAccessCta } from './request-access-cta'
import { STEPS } from '../constants/landing-content'

/** Como funciona — content-alt section with three steps and a wine CTA. */
export function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-content-alt px-10 py-section text-content-text">
      <div className="mx-auto max-w-content">
        <h2 className="mb-14 text-center text-7xl font-bold">Comece hoje, em três passos.</h2>
        <div className="mb-12 grid gap-8 md:grid-cols-3">
          {STEPS.map((step) => (
            <StepCard
              key={step.number}
              number={step.number}
              title={step.title}
              description={step.description}
            />
          ))}
        </div>
        <div className="text-center">
          <RequestAccessCta variant="wine" size="md">
            Solicitar acesso ao sistema
          </RequestAccessCta>
        </div>
      </div>
    </section>
  )
}
