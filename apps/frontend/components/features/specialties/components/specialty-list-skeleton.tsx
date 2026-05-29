import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'

export function SpecialtyListSkeleton() {
  return (
    <div data-testid="specialty-list-skeleton">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-6 py-4 last:border-0">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton height={12} className="w-48" />
            <Skeleton height={10} className="w-64" />
          </div>
          <Skeleton height={10} className="w-32" />
          <Skeleton height={12} className="w-20" />
        </div>
      ))}
    </div>
  )
}
