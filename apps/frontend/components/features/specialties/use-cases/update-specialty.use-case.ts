import { specialtiesService } from '../services/specialties.service'
import { toSpecialtyModel } from '../mappers/to-specialty-model.mapper'
import { toUpdateSpecialtyDto } from '../mappers/to-update-specialty-dto.mapper'
import type { ISpecialtyModel } from '../types/specialty-model.types'
import type { IUpdateSpecialtyInput } from '../types/specialty-input.types'

export async function updateSpecialtyUseCase(
  id: string,
  input: IUpdateSpecialtyInput,
): Promise<ISpecialtyModel> {
  const dto = await specialtiesService.update(id, toUpdateSpecialtyDto(input))
  return toSpecialtyModel(dto)
}
