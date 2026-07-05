import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'

export function DashboardSkeleton() {
  return (
    <div data-testid="dashboard-loading" className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
      <Skeleton className="h-56 w-full" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="col-span-2 h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  )
}
