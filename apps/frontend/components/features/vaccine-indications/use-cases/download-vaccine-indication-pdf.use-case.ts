import { vaccineIndicationsService } from '../services/vaccine-indications.service'

export async function downloadVaccineIndicationPdfUseCase(id: string, fileName?: string): Promise<void> {
  const blob = await vaccineIndicationsService.downloadPdf(id)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName ?? `indicacao-vacina-${id}.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}
