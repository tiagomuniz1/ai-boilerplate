import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'

export function MedicalRecordFormSkeleton() {
  return (
    <div className="space-y-4" data-testid="medical-record-form-skeleton">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}
