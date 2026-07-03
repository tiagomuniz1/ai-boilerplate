'use client'

import { useMutation } from '@tanstack/react-query'
import { downloadAtestadoPdfUseCase } from '../use-cases/download-atestado-pdf.use-case'

export function useDownloadAtestadoPdf() {
  return useMutation({
    mutationFn: ({ id, fileName }: { id: string; fileName?: string }) =>
      downloadAtestadoPdfUseCase(id, fileName),
  })
}
