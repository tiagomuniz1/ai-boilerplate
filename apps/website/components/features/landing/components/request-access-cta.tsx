'use client'

import { CtaButton, type CtaButtonProps } from '@/components/ui/atoms/cta-button/cta-button'
import { useAccessRequestModalStore } from '@/stores/access-request-modal.store'

/** Opens the access-request modal. Isolated as a client component so the sections
 * that render it (Hero, Navbar, FinalCta, HowItWorks) can stay server components. */
export function RequestAccessCta({ children, ...props }: Omit<CtaButtonProps, 'onClick'>) {
  const open = useAccessRequestModalStore((s) => s.open)

  return (
    <CtaButton onClick={open} {...props}>
      {children}
    </CtaButton>
  )
}
