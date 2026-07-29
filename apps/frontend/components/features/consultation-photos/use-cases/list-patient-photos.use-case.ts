import { consultationPhotosService } from '../services/consultation-photos.service'
import { toConsultationPhotoGalleryItemModel } from '../mappers/to-consultation-photo-gallery-item-model.mapper'
import type { IPaginatedConsultationPhotosModel } from '../types/consultation-photo-model.types'

export async function listPatientPhotosUseCase(
  patientId: string,
  page: number,
  limit: number,
): Promise<IPaginatedConsultationPhotosModel> {
  const dto = await consultationPhotosService.getByPatient(patientId, { page, limit })
  return {
    data: dto.data.map(toConsultationPhotoGalleryItemModel),
    total: dto.total,
    page: dto.page,
    limit: dto.limit,
  }
}
