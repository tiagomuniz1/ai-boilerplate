import { medicationsService } from '../services/medications.service'
import { toMedicationModel } from '../mappers/to-medication-model.mapper'
import type { IMedicationListParams, IPaginatedMedications } from '../types/medication-model.types'

export async function listMedicationsUseCase(
  params?: IMedicationListParams,
): Promise<IPaginatedMedications> {
  const response = await medicationsService.getAll(params)
  return {
    data: response.data.map((dto) => toMedicationModel(dto)),
    total: response.total,
    page: response.page,
    limit: response.limit,
  }
}
