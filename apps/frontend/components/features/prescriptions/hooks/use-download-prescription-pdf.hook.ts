'use client'

import { useMutation } from '@tanstack/react-query'
import { downloadPrescriptionPdfUseCase } from '../use-cases/download-prescription-pdf.use-case'

export function useDownloadPrescriptionPdf() {
  return useMutation({
    mutationFn: ({ id, fileName }: { id: string; fileName?: string }) =>
      downloadPrescriptionPdfUseCase(id, fileName),
  })
}
