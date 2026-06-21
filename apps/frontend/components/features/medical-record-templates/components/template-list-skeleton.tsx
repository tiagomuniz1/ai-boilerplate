import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'

export function TemplateListSkeleton() {
  return (
    <div data-testid="template-list-skeleton" className="p-4 flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} height={40} className="w-full" />
      ))}
    </div>
  )
}
