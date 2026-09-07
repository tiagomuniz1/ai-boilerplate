import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateVaccineUseCase } from '../use-cases/update-vaccine.use-case'
import type { IUpdateVaccineInput } from '../types/vaccine-input.types'

export function useUpdateVaccine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IUpdateVaccineInput }) =>
      updateVaccineUseCase(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vaccines'] }),
  })
}
