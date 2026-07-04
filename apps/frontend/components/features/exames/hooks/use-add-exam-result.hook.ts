'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addExamResultUseCase } from '../use-cases/add-exam-result.use-case'

export function useAddExamResult(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ examRequestId, files }: { examRequestId: string; files: File[] }) =>
      addExamResultUseCase(examRequestId, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-requests', appointmentId] })
    },
  })
}
