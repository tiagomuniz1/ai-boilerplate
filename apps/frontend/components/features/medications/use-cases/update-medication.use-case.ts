import { medicationsService } from '../services/medications.service'
import { toMedicationModel } from '../mappers/to-medication-model.mapper'
import { toUpdateMedicationDto } from '../mappers/to-update-medication-dto.mapper'
import type { IMedicationModel } from '../types/medication-model.types'
import type { IUpdateMedicationInput } from '../types/medication-input.types'

export async function updateMedicationUseCase(
  id: string,
  input: IUpdateMedicationInput,
): Promise<IMedicationModel> {
  const dto = await medicationsService.update(id, toUpdateMedicationDto(input))
  return toMedicationModel(dto)
}
