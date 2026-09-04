import { vaccinationsService } from '../services/vaccinations.service'
import { toVaccinationModel } from '../mappers/to-vaccination-model.mapper'
import type { ICreateVaccinationInput } from '../types/vaccination-input.types'
import type { IVaccinationModel } from '../types/vaccination-model.types'

export async function createVaccinationUseCase(
  data: ICreateVaccinationInput,
): Promise<IVaccinationModel> {
  return toVaccinationModel(await vaccinationsService.create(data as never))
}
