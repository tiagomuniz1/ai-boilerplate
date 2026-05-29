import { specialtiesService } from '../services/specialties.service'

export async function deleteSpecialtyUseCase(id: string): Promise<void> {
  return specialtiesService.remove(id)
}
