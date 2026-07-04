'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteExamRequestUseCase } from '../use-cases/delete-exam-request.use-case'

export function useDeleteExamRequest(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteExamRequestUseCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-requests', appointmentId] })
    },
  })
}
