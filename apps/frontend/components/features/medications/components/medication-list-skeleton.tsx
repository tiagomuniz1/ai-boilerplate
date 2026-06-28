import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'

export function MedicationListSkeleton() {
  return (
    <div data-testid="medication-list-skeleton" className="p-4 flex flex-col gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} height={40} className="w-full" />
      ))}
    </div>
  )
}
