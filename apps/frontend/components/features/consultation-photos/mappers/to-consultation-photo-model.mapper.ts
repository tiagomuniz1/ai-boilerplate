import type { ConsultationPhotoResponseDto } from '@app/shared'
import type { IConsultationPhotoModel } from '../types/consultation-photo-model.types'

export function toConsultationPhotoModel(dto: ConsultationPhotoResponseDto): IConsultationPhotoModel {
  return {
    id: dto.id,
    appointmentId: dto.appointmentId,
    fileName: dto.fileName,
    mimeType: dto.mimeType,
    fileSizeBytes: dto.fileSizeBytes,
    createdAt: new Date(dto.createdAt as unknown as string),
  }
}
