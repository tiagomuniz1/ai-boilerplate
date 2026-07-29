import { consultationPhotosService } from '../services/consultation-photos.service'

// Returns the raw Blob — creating/revoking the object URL is the responsibility of
// whichever hook/component consumes it (usePhotoThumbnail), never this use-case.
export async function fetchConsultationPhotoBlobUseCase(id: string): Promise<Blob> {
  return consultationPhotosService.getFileBlob(id)
}
