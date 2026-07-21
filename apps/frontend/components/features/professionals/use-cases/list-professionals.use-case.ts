import { professionalsService } from '../services/professionals.service'
import { toProfessionalModel } from '../mappers/to-professional-model.mapper'
import type { IProfessionalModel } from '../types/professional-model.types'
import type { IProfessionalListParams } from '../types/professional-input.types'

export async function listProfessionalsUseCase(params?: IProfessionalListParams): Promise<IProfessionalModel[]> {
  const { data } = await professionalsService.getAll(params)
  return data.map(toProfessionalModel)
}
