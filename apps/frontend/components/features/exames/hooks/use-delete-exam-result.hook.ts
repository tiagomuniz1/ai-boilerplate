'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteExamResultUseCase } from '../use-cases/delete-exam-result.use-case'

export function useDeleteExamResult(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteExamResultUseCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-requests', appointmentId] })
    },
  })
}
