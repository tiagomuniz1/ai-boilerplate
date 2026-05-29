import { specialtiesService } from '../services/specialties.service'
import { toSpecialtyModel } from '../mappers/to-specialty-model.mapper'
import { toCreateSpecialtyDto } from '../mappers/to-create-specialty-dto.mapper'
import type { ISpecialtyModel } from '../types/specialty-model.types'
import type { ICreateSpecialtyInput } from '../types/specialty-input.types'

export async function createSpecialtyUseCase(input: ICreateSpecialtyInput): Promise<ISpecialtyModel> {
  const dto = await specialtiesService.create(toCreateSpecialtyDto(input))
  return toSpecialtyModel(dto)
}
