'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteVaccineIndicationUseCase } from '../use-cases/delete-vaccine-indication.use-case'

export function useDeleteVaccineIndication(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteVaccineIndicationUseCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccine-indications', appointmentId] })
    },
  })
}
