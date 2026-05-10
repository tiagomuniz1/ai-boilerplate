import { useQuery } from '@tanstack/react-query'
import { listUsersUseCase } from '../use-cases/list-users.use-case'
import type { IUserListParams } from '../types/user-input.types'

export function useUsers(params?: IUserListParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => listUsersUseCase(params),
  })
}
