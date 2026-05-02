import { useQuery } from '@tanstack/react-query'
import { listUsersUseCase } from '../use-cases/list-users.use-case'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: listUsersUseCase,
  })
}
