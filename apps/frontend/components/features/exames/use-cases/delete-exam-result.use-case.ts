import { examsService } from '../services/exams.service'

export async function deleteExamResultUseCase(id: string): Promise<void> {
  await examsService.removeResult(id)
}
