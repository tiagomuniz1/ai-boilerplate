import { vaccinationsService } from '../services/vaccinations.service'

export async function deleteVaccinationUseCase(id: string): Promise<void> {
  await vaccinationsService.remove(id)
}
