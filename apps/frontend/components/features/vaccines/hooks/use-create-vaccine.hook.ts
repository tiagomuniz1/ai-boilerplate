import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createVaccineUseCase } from '../use-cases/create-vaccine.use-case'

export function useCreateVaccine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createVaccineUseCase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vaccines'] }),
  })
}
