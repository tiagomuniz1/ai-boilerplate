import { ConsultationPhotoGalleryItemResponseDto } from './consultation-photo-gallery-item-response.dto'

export class PaginatedConsultationPhotosResponseDto {
  data!: ConsultationPhotoGalleryItemResponseDto[]
  total!: number
  page!: number
  limit!: number
}
