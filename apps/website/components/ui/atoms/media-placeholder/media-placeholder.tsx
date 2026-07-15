import { cn } from '@/lib/cn'

export interface MediaPlaceholderProps {
  /** `dark` uses the midnight stripe pattern; `light` uses the warm stripe pattern. */
  tone?: 'dark' | 'light'
  /** Aspect-ratio utility class, e.g. `aspect-[16/11]`. */
  aspectClassName?: string
  className?: string
  children: React.ReactNode
}

const toneClasses: Record<NonNullable<MediaPlaceholderProps['tone']>, string> = {
  dark: 'bg-placeholder-dark border-white/[0.12] text-dark-fg-placeholder',
  light: 'bg-placeholder-light border-soft-gray text-light-fg-placeholder',
}

/**
 * Striped placeholder standing in for a real product screenshot. The monospace caption
 * marks what belongs there. Replace with actual captures before launch — never stock art.
 */
export function MediaPlaceholder({
  tone = 'dark',
  aspectClassName = 'aspect-[16/11]',
  className,
  children,
}: MediaPlaceholderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-3xl border p-5',
        toneClasses[tone],
        aspectClassName,
        className,
      )}
    >
      <span className="text-center font-mono text-xs leading-relaxed">{children}</span>
    </div>
  )
}
