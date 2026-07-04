'use client'

import { useMutation } from '@tanstack/react-query'
import { downloadExamRequestPdfUseCase } from '../use-cases/download-exam-request-pdf.use-case'

export function useDownloadExamRequestPdf() {
  return useMutation({
    mutationFn: ({ id, fileName }: { id: string; fileName?: string }) =>
      downloadExamRequestPdfUseCase(id, fileName),
  })
}
