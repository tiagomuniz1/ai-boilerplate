import { appointmentsService } from '../services/appointments.service'
import { toReassignCandidateModel } from '../mappers/to-reassign-candidate-model.mapper'
import type { IReassignCandidateModel } from '../types/appointment-model.types'

export async function getReassignCandidatesUseCase(id: string): Promise<IReassignCandidateModel[]> {
  const dtos = await appointmentsService.getReassignCandidates(id)
  return dtos.map(toReassignCandidateModel)
}
