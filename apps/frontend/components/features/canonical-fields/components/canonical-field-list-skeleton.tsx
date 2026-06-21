import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'

export function CanonicalFieldListSkeleton() {
  return (
    <div data-testid="canonical-field-list-skeleton" className="p-4 flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} height={40} className="w-full" />
      ))}
    </div>
  )
}
