import { TrustBadge } from '@/components/ui/molecules/trust-badge/trust-badge'
import { TRUST_ITEMS } from '../constants/landing-content'

/** Warm-white proof bar just under the hero — fixed light by design. */
export function TrustBar() {
  return (
    <section className="border-b border-soft-gray bg-warm-white px-10 py-9">
      <div className="mx-auto flex max-w-content flex-wrap justify-center gap-7">
        {TRUST_ITEMS.map((item) => (
          <TrustBadge key={item}>{item}</TrustBadge>
        ))}
      </div>
    </section>
  )
}
