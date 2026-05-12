import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteDoctorUseCase } from '../use-cases/delete-doctor.use-case'
import type { IApiError } from '@/types/api.types'

export function useDeleteDoctor() {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: deleteDoctorUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
    },
  })
}
