import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteProfessionalUseCase } from '../use-cases/delete-professional.use-case'
import type { IApiError } from '@/types/api.types'

export function useDeleteProfessional() {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: deleteProfessionalUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
