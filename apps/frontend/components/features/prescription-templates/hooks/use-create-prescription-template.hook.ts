'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPrescriptionTemplateUseCase } from '../use-cases/create-prescription-template.use-case'

export function useCreatePrescriptionTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPrescriptionTemplateUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescription-templates'] })
    },
  })
}
