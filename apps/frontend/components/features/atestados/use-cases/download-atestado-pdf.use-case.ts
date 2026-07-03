import { atestadosService } from '../services/atestados.service'

export async function downloadAtestadoPdfUseCase(id: string, fileName?: string): Promise<void> {
  const blob = await atestadosService.downloadPdf(id)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName ?? `atestado-${id}.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}
