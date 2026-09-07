import { vaccinesService } from '../services/vaccines.service'
import { toVaccineModel } from '../mappers/to-vaccine-model.mapper'
import type { IPaginatedVaccines, IVaccineListParams } from '../types/vaccine-model.types'

export async function listVaccinesUseCase(
  params?: IVaccineListParams,
): Promise<IPaginatedVaccines> {
  const page = await vaccinesService.getAll(params)
  return { ...page, data: page.data.map(toVaccineModel) }
}
