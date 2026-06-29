import { prescriptionsService } from '../services/prescriptions.service'

export async function deletePrescriptionUseCase(id: string): Promise<void> {
  await prescriptionsService.remove(id)
}
