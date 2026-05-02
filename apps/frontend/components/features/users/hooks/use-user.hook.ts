import { useQuery } from '@tanstack/react-query'
import { getUserUseCase } from '../use-cases/get-user.use-case'

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => getUserUseCase(id),
  })
}
