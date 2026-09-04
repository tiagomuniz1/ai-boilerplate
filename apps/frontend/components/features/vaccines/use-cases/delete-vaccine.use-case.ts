import { vaccinesService } from '../services/vaccines.service'

export async function deleteVaccineUseCase(id: string): Promise<void> {
  await vaccinesService.remove(id)
}
