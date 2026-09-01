import { professionalsService } from '../services/professionals.service'
import { toProfessionalModel } from '../mappers/to-professional-model.mapper'
import type { IProfessionalModel } from '../types/professional-model.types'

export async function getMyProfessionalUseCase(): Promise<IProfessionalModel | null> {
  const dto = await professionalsService.getMine()
  return dto ? toProfessionalModel(dto) : null
}
