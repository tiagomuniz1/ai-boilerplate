import { specialtiesService } from '../services/specialties.service'
import { toSpecialtyModel } from '../mappers/to-specialty-model.mapper'
import type { ISpecialtyModel } from '../types/specialty-model.types'

export async function getSpecialtyUseCase(id: string): Promise<ISpecialtyModel> {
  const dto = await specialtiesService.getById(id)
  return toSpecialtyModel(dto)
}
