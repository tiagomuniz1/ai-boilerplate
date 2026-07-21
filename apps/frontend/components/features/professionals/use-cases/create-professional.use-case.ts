import { professionalsService } from '../services/professionals.service'
import { toProfessionalModel } from '../mappers/to-professional-model.mapper'
import { toCreateProfessionalDto } from '../mappers/to-create-professional-dto.mapper'
import type { IProfessionalModel } from '../types/professional-model.types'
import type { ICreateProfessionalInput } from '../types/professional-input.types'

export async function createProfessionalUseCase(input: ICreateProfessionalInput): Promise<IProfessionalModel> {
  const dto = await professionalsService.create(toCreateProfessionalDto(input))
  return toProfessionalModel(dto)
}
