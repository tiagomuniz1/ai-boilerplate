import { examsService } from '../services/exams.service'

export async function downloadExamRequestPdfUseCase(id: string, fileName?: string): Promise<void> {
  const blob = await examsService.downloadPdf(id)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName ?? `pedido-exames-${id}.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}
