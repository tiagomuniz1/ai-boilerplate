import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'

export function ScheduleListSkeleton() {
  return (
    <div data-testid="schedule-list-skeleton">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-6 py-4 last:border-0">
          <Skeleton height={12} className="w-32" />
          <Skeleton height={12} className="w-40" />
          <Skeleton height={12} className="w-20" />
          <Skeleton height={12} className="w-28" />
          <Skeleton height={12} className="w-16" />
        </div>
      ))}
    </div>
  )
}
