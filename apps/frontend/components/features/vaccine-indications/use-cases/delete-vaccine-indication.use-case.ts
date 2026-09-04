import { vaccineIndicationsService } from '../services/vaccine-indications.service'

export async function deleteVaccineIndicationUseCase(id: string): Promise<void> {
  await vaccineIndicationsService.remove(id)
}
