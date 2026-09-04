import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createVaccinationUseCase } from '../use-cases/create-vaccination.use-case'

export function useCreateVaccination() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createVaccinationUseCase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vaccinations'] }),
  })
}
