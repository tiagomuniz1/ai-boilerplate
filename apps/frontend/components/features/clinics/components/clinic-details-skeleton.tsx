import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'

export function ClinicDetailsSkeleton() {
  return (
    <div className="flex flex-col gap-6" data-testid="clinic-details-skeleton">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton height={28} className="w-64" />
          <Skeleton height={16} className="w-40" />
        </div>
        <Skeleton height={32} className="w-20" />
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 bg-surface px-6 py-4">
              <Skeleton height={10} className="w-20" />
              <Skeleton height={14} className="w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
