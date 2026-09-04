import { vaccinesService } from '../services/vaccines.service'
import { toVaccineModel } from '../mappers/to-vaccine-model.mapper'
import type { IVaccineModel } from '../types/vaccine-model.types'

export async function getVaccineUseCase(id: string): Promise<IVaccineModel> {
  return toVaccineModel(await vaccinesService.getById(id))
}
