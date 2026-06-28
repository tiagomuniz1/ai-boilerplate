import { medicationsService } from '../services/medications.service'

export async function deleteMedicationUseCase(id: string): Promise<void> {
  await medicationsService.remove(id)
}
