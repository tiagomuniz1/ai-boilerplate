import { medicationsService } from '../services/medications.service'
import { toMedicationModel } from '../mappers/to-medication-model.mapper'
import type { IMedicationModel } from '../types/medication-model.types'

export async function getMedicationUseCase(id: string): Promise<IMedicationModel> {
  const dto = await medicationsService.getById(id)
  return toMedicationModel(dto)
}
