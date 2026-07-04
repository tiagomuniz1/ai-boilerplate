import { examsService } from '../services/exams.service'
import { toExamRequestModel } from '../mappers/to-exam-request-model.mapper'
import type { IExamRequestModel } from '../types/exam-request-model.types'

export async function listExamRequestsUseCase(appointmentId: string): Promise<IExamRequestModel[]> {
  const dtos = await examsService.getByAppointment(appointmentId)
  return dtos.map(toExamRequestModel)
}
