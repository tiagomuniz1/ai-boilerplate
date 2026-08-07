import type { ReassignCandidateDto } from '@app/shared'
import type { IReassignCandidateModel } from '../types/appointment-model.types'

export function toReassignCandidateModel(dto: ReassignCandidateDto): IReassignCandidateModel {
  return {
    professionalId: dto.professionalId,
    professionalName: dto.professionalName,
    specialtyName: dto.specialtyName,
  }
}
