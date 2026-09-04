'use client'

import { useMutation } from '@tanstack/react-query'
import { downloadVaccineIndicationPdfUseCase } from '../use-cases/download-vaccine-indication-pdf.use-case'

export function useDownloadVaccineIndicationPdf() {
  return useMutation({
    mutationFn: ({ id, fileName }: { id: string; fileName?: string }) =>
      downloadVaccineIndicationPdfUseCase(id, fileName),
  })
}
