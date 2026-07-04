import { examsService } from '../services/exams.service'

export async function downloadExamResultFileUseCase(id: string, fileName: string): Promise<void> {
  const blob = await examsService.downloadResultFile(id)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}
