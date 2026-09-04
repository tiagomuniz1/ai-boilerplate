import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteVaccinationUseCase } from '../use-cases/delete-vaccination.use-case'

export function useDeleteVaccination() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteVaccinationUseCase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vaccinations'] }),
  })
}
