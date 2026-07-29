import { consultationPhotosService } from '../services/consultation-photos.service'

export async function deleteConsultationPhotoUseCase(id: string): Promise<void> {
  await consultationPhotosService.remove(id)
}
