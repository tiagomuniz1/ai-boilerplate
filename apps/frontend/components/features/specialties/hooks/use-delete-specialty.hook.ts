import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteSpecialtyUseCase } from '../use-cases/delete-specialty.use-case'
import type { IApiError } from '@/types/api.types'

export function useDeleteSpecialty() {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: deleteSpecialtyUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialties'] })
    },
  })
}
