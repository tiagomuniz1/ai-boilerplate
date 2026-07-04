import { examsService } from '../services/exams.service'
import { toExamRequestModel } from '../mappers/to-exam-request-model.mapper'
import type { IExamRequestModel } from '../types/exam-request-model.types'

export async function addExamResultUseCase(examRequestId: string, files: File[]): Promise<IExamRequestModel> {
  const dto = await examsService.addResult(examRequestId, files)
  return toExamRequestModel(dto)
}
