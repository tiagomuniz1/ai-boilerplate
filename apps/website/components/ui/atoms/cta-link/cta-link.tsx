import { forwardRef, type AnchorHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface CtaLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: 'primary' | 'outline' | 'wine' | 'white'
  size?: 'sm' | 'md' | 'lg'
}

const variantClasses: Record<NonNullable<CtaLinkProps['variant']>, string> = {
  primary: 'bg-terracotta text-white hover:bg-terracotta-hover',
  outline:
    'border border-warm-white/30 text-warm-white hover:border-terracotta hover:text-terracotta',
  wine: 'bg-wine text-white hover:bg-wine-hover',
  white: 'bg-warm-white text-wine hover:bg-white',
}

const sizeClasses: Record<NonNullable<CtaLinkProps['size']>, string> = {
  sm: 'px-5 py-2.5 text-base font-semibold rounded-md',
  md: 'px-7 py-4 text-md font-bold rounded-lg',
  lg: 'px-8 py-4 text-md font-bold rounded-lg',
}

/**
 * Anchor styled as a button. Every "Criar clínica grátis" CTA points at the clinic
 * self-service registration flow (see `REGISTER_URL`).
 */
export const CtaLink = forwardRef<HTMLAnchorElement, CtaLinkProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center text-center transition-colors duration-150',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {children}
      </a>
    )
  },
)

CtaLink.displayName = 'CtaLink'
