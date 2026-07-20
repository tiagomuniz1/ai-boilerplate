import { professionalsService } from '../services/professionals.service'
import { toProfessionalModel } from '../mappers/to-professional-model.mapper'
import { toUpdateProfessionalDto } from '../mappers/to-update-professional-dto.mapper'
import type { IProfessionalModel } from '../types/professional-model.types'
import type { IUpdateProfessionalInput } from '../types/professional-input.types'

export async function updateProfessionalUseCase(
  id: string,
  input: IUpdateProfessionalInput,
): Promise<IProfessionalModel> {
  const dto = await professionalsService.update(id, toUpdateProfessionalDto(input))
  return toProfessionalModel(dto)
}
