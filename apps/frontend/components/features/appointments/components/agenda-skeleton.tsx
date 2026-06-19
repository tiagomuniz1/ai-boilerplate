export function AgendaSkeleton() {
  return (
    <div data-testid="agenda-skeleton" className="animate-pulse space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-14 rounded-md bg-surface-2" />
      ))}
    </div>
  )
}
