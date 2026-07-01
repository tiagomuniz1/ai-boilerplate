import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'

export function PrescriptionTemplateListSkeleton() {
  return (
    <div data-testid="prescription-template-list-skeleton" className="flex flex-col">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-line last:border-0">
          <Skeleton height={16} className="w-48" />
          <Skeleton height={16} className="w-24" />
          <Skeleton height={16} className="w-16 ml-auto" />
        </div>
      ))}
    </div>
  )
}
