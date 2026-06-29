'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deletePrescriptionUseCase } from '../use-cases/delete-prescription.use-case'

export function useDeletePrescription(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deletePrescriptionUseCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions', appointmentId] })
    },
  })
}
