import { professionalsService } from '../services/professionals.service'
import { toProfessionalModel } from '../mappers/to-professional-model.mapper'
import type { IProfessionalModel } from '../types/professional-model.types'

export async function getProfessionalUseCase(id: string): Promise<IProfessionalModel> {
  const dto = await professionalsService.getById(id)
  return toProfessionalModel(dto)
}
