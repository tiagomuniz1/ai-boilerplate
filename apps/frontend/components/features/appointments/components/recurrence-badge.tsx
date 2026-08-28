'use client'

import { cn } from '@/lib/cn'

function RepeatIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

interface RecurrenceBadgeProps {
  sequence: number
  total: number
  /** Icon only — for the cramped agenda cell, where the text would not fit. */
  compact?: boolean
  className?: string
  'data-testid'?: string
}

export function RecurrenceBadge({
  sequence,
  total,
  compact = false,
  className,
  'data-testid': testId,
}: RecurrenceBadgeProps) {
  const label = `Sessão ${sequence} de ${total}`

  if (compact) {
    return (
      <span data-testid={testId} title={label} aria-label={label} className={cn('text-current', className)}>
        <RepeatIcon size={12} />
      </span>
    )
  }

  return (
    <span data-testid={testId} className={cn('inline-flex items-center gap-1.5 text-sm', className)}>
      <RepeatIcon />
      {label}
    </span>
  )
}
