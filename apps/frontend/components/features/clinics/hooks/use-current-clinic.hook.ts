import { useQuery } from '@tanstack/react-query'
import { useSlug } from '@/lib/slug-context'
import { getClinicBySlugUseCase } from '../use-cases/get-clinic-by-slug.use-case'

export function useCurrentClinic() {
  const slug = useSlug()
  const enabled = !!slug && slug !== 'backoffice'
  return useQuery({
    queryKey: ['clinics', 'slug', slug],
    queryFn: () => getClinicBySlugUseCase(slug),
    enabled,
    staleTime: 1000 * 60 * 5,
  })
}
