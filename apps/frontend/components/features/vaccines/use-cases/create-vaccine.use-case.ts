import { vaccinesService } from '../services/vaccines.service'
import { toVaccineModel } from '../mappers/to-vaccine-model.mapper'
import type { ICreateVaccineInput } from '../types/vaccine-input.types'
import type { IVaccineModel } from '../types/vaccine-model.types'

export async function createVaccineUseCase(data: ICreateVaccineInput): Promise<IVaccineModel> {
  return toVaccineModel(await vaccinesService.create(data as never))
}
