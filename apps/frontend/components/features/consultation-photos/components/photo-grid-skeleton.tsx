import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'

export function PhotoGridSkeleton() {
  return (
    <div data-testid="photo-grid-skeleton" className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} height={120} className="w-full rounded-xl" />
      ))}
    </div>
  )
}
