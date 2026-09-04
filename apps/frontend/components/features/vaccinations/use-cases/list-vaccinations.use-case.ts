import { vaccinationsService } from '../services/vaccinations.service'
import { toVaccinationModel } from '../mappers/to-vaccination-model.mapper'
import type {
  IPaginatedVaccinations,
  IVaccinationListParams,
} from '../types/vaccination-model.types'

export async function listVaccinationsUseCase(
  params: IVaccinationListParams,
): Promise<IPaginatedVaccinations> {
  const page = await vaccinationsService.getAll(params)
  return { ...page, data: page.data.map(toVaccinationModel) }
}
