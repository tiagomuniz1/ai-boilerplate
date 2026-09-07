import { vaccinesService } from '../services/vaccines.service'
import { toVaccineModel } from '../mappers/to-vaccine-model.mapper'
import type { IUpdateVaccineInput } from '../types/vaccine-input.types'
import type { IVaccineModel } from '../types/vaccine-model.types'

export async function updateVaccineUseCase(
  id: string,
  data: IUpdateVaccineInput,
): Promise<IVaccineModel> {
  return toVaccineModel(await vaccinesService.update(id, data as never))
}
