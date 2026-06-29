import { prescriptionsService } from '../services/prescriptions.service'

export async function downloadPrescriptionPdfUseCase(id: string, fileName?: string): Promise<void> {
  const blob = await prescriptionsService.downloadPdf(id)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName ?? `receita-${id}.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}
