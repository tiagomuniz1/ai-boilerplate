import { examsService } from '../services/exams.service'

export async function deleteExamRequestUseCase(id: string): Promise<void> {
  await examsService.remove(id)
}
