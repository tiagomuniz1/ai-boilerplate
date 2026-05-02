import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteUserUseCase } from '../use-cases/delete-user.use-case'
import type { IApiError } from '@/types/api.types'

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: deleteUserUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
