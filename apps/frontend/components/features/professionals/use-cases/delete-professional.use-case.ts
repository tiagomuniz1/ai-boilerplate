import { professionalsService } from '../services/professionals.service'

export async function deleteProfessionalUseCase(id: string): Promise<void> {
  return professionalsService.remove(id)
}
