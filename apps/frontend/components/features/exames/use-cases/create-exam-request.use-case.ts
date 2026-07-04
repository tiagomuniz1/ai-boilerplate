import { examsService } from '../services/exams.service'
import { toCreateExamRequestDto } from '../mappers/to-create-exam-request-dto.mapper'
import { toExamRequestModel } from '../mappers/to-exam-request-model.mapper'
import type { ICreateExamRequestInput } from '../types/exam-request-input.types'
import type { IExamRequestModel } from '../types/exam-request-model.types'

export async function createExamRequestUseCase(input: ICreateExamRequestInput): Promise<IExamRequestModel> {
  const dto = await examsService.create(toCreateExamRequestDto(input))
  return toExamRequestModel(dto)
}
