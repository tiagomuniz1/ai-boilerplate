import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import {
  ctaBaseClasses,
  ctaSizeClasses,
  ctaVariantClasses,
  type CtaSize,
  type CtaVariant,
} from '../cta-link/cta-styles'

export interface CtaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CtaVariant
  size?: CtaSize
}

/** Button styled identically to `CtaLink`, for actions that open a dialog instead of navigating. */
export const CtaButton = forwardRef<HTMLButtonElement, CtaButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(ctaBaseClasses, ctaVariantClasses[variant], ctaSizeClasses[size], className)}
        {...props}
      >
        {children}
      </button>
    )
  },
)

CtaButton.displayName = 'CtaButton'
