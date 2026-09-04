import { vaccineIndicationsService } from '../services/vaccine-indications.service'
import { toCreateVaccineIndicationDto } from '../mappers/to-create-vaccine-indication-dto.mapper'
import { toVaccineIndicationModel } from '../mappers/to-vaccine-indication-model.mapper'
import type { ICreateVaccineIndicationInput } from '../types/vaccine-indication-input.types'
import type { IVaccineIndicationModel } from '../types/vaccine-indication-model.types'

export async function createVaccineIndicationUseCase(
  input: ICreateVaccineIndicationInput,
): Promise<IVaccineIndicationModel> {
  const dto = await vaccineIndicationsService.create(toCreateVaccineIndicationDto(input))
  return toVaccineIndicationModel(dto)
}
