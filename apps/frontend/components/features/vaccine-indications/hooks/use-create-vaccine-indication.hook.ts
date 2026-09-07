'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createVaccineIndicationUseCase } from '../use-cases/create-vaccine-indication.use-case'

export function useCreateVaccineIndication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createVaccineIndicationUseCase,
    onSuccess: (indication) => {
      queryClient.invalidateQueries({ queryKey: ['vaccine-indications', indication.appointmentId] })
    },
  })
}
