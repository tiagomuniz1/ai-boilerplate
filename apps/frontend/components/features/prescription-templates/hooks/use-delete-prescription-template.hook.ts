'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deletePrescriptionTemplateUseCase } from '../use-cases/delete-prescription-template.use-case'

export function useDeletePrescriptionTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deletePrescriptionTemplateUseCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescription-templates'] })
    },
  })
}
