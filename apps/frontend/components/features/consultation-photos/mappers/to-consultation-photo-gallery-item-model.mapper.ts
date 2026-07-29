import type { ConsultationPhotoGalleryItemResponseDto } from '@app/shared'
import type { IConsultationPhotoGalleryItemModel } from '../types/consultation-photo-model.types'

export function toConsultationPhotoGalleryItemModel(
  dto: ConsultationPhotoGalleryItemResponseDto,
): IConsultationPhotoGalleryItemModel {
  return {
    id: dto.id,
    appointmentId: dto.appointmentId,
    fileName: dto.fileName,
    mimeType: dto.mimeType,
    fileSizeBytes: dto.fileSizeBytes,
    createdAt: new Date(dto.createdAt as unknown as string),
    professionalName: dto.professionalName,
    appointmentDate: new Date(dto.appointmentDate as unknown as string),
  }
}
