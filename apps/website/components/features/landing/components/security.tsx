import { SecurityCard } from '@/components/ui/molecules/security-card/security-card'
import { SECURITY_BULLETS } from '../constants/landing-content'

/** Segurança — always dark by brand identity, independent of the theme toggle. */
export function Security() {
  return (
    <section id="seguranca" className="bg-midnight px-10 py-section text-warm-white">
      <div className="mx-auto max-w-content">
        <div className="mx-auto mb-14 max-w-prose text-center">
          <h2 className="text-7xl font-bold">Segurança não é recurso — é fundação.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {SECURITY_BULLETS.map((bullet) => (
            <SecurityCard
              key={bullet.title}
              title={bullet.title}
              description={bullet.description}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
