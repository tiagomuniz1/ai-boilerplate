'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updatePrescriptionTemplateUseCase } from '../use-cases/update-prescription-template.use-case'

export function useUpdatePrescriptionTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updatePrescriptionTemplateUseCase>[1] }) =>
      updatePrescriptionTemplateUseCase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescription-templates'] })
    },
  })
}
