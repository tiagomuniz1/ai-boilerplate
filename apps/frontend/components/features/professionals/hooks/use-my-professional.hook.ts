import { useQuery } from '@tanstack/react-query'
import { listProfessionalsUseCase } from '../use-cases/list-professionals.use-case'

// GET /professionals with no filters already returns only the caller's own record when the
// caller is a PROFESSIONAL (see backend FindAllProfessionalsUseCase). `enabled` defaults to true
// but should be set to `role === PROFESSIONAL` by callers that might also be ADMIN — for ADMIN
// this same call would return the clinic's entire professional list, which isn't "mine" at all.
export function useMyProfessional(options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: ['professionals', 'me'],
    queryFn: () => listProfessionalsUseCase(),
    enabled: options?.enabled ?? true,
  })
  return { ...query, data: query.data?.[0] }
}
