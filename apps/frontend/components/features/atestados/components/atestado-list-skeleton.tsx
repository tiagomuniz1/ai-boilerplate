import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'

export function AtestadoListSkeleton() {
  return (
    <div data-testid="atestado-list-skeleton" className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} height={48} className="w-full" />
      ))}
    </div>
  )
}
