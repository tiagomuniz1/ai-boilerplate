import { cn } from '@/lib/cn'

export interface LogoProps {
  size?: 'sm' | 'md'
  className?: string
}

const markSize: Record<NonNullable<LogoProps['size']>, number> = {
  sm: 26,
  md: 30,
}

const wordClasses: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'text-2xl',
  md: 'text-4xl',
}

/**
 * The Pulso wordmark preceded by the geometric mark — two overlapping rings
 * (wine + terracotta). Placeholder identity; replace with the official brand asset
 * in production. Always rendered on dark/wine backgrounds.
 */
export function Logo({ size = 'md', className }: LogoProps) {
  const px = markSize[size]

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 30 30"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle cx="20" cy="10" r="7.5" strokeWidth="5" className="stroke-wine" />
        <circle cx="9" cy="21" r="6.5" strokeWidth="5" className="stroke-terracotta" />
      </svg>
      <span className={cn('font-bold text-warm-white', wordClasses[size])}>pulso</span>
    </div>
  )
}
