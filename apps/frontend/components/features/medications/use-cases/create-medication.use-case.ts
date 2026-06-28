import { medicationsService } from '../services/medications.service'
import { toMedicationModel } from '../mappers/to-medication-model.mapper'
import { toCreateMedicationDto } from '../mappers/to-create-medication-dto.mapper'
import type { IMedicationModel } from '../types/medication-model.types'
import type { ICreateMedicationInput } from '../types/medication-input.types'

export async function createMedicationUseCase(
  input: ICreateMedicationInput,
): Promise<IMedicationModel> {
  const dto = await medicationsService.create(toCreateMedicationDto(input))
  return toMedicationModel(dto)
}
