'use client'

import { useMutation } from '@tanstack/react-query'
import { downloadExamResultFileUseCase } from '../use-cases/download-exam-result-file.use-case'

export function useDownloadExamResultFile() {
  return useMutation({
    mutationFn: ({ id, fileName }: { id: string; fileName: string }) =>
      downloadExamResultFileUseCase(id, fileName),
  })
}
