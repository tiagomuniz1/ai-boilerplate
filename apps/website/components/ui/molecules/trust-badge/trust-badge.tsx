export interface TrustBadgeProps {
  children: React.ReactNode
}

/** Small proof point in the trust bar: a terracotta dot + short label. */
export function TrustBadge({ children }: TrustBadgeProps) {
  return (
    <div
      data-testid="trust-badge"
      className="flex items-center gap-2.5 text-sm font-semibold text-light-fg-muted"
    >
      <span className="h-2 w-2 shrink-0 rounded-pill bg-terracotta" aria-hidden="true" />
      {children}
    </div>
  )
}
