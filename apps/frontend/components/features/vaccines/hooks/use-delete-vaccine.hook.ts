import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteVaccineUseCase } from '../use-cases/delete-vaccine.use-case'

export function useDeleteVaccine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteVaccineUseCase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vaccines'] }),
  })
}
