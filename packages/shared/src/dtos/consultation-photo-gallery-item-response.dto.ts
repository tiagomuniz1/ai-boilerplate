import { ConsultationPhotoResponseDto } from './consultation-photo-response.dto'

export class ConsultationPhotoGalleryItemResponseDto extends ConsultationPhotoResponseDto {
  professionalName!: string
  appointmentDate!: Date
}
