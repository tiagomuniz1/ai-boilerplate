import { forwardRef, type AnchorHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { ctaBaseClasses, ctaSizeClasses, ctaVariantClasses, type CtaSize, type CtaVariant } from './cta-styles'

export interface CtaLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: CtaVariant
  size?: CtaSize
}

/** Anchor styled as a button — used for in-page/external links. See `CtaButton` for actions. */
export const CtaLink = forwardRef<HTMLAnchorElement, CtaLinkProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={cn(ctaBaseClasses, ctaVariantClasses[variant], ctaSizeClasses[size], className)}
        {...props}
      >
        {children}
      </a>
    )
  },
)

CtaLink.displayName = 'CtaLink'
