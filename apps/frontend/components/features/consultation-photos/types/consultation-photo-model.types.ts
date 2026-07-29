export interface IConsultationPhotoModel {
  id: string
  appointmentId: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
  createdAt: Date
}

export interface IConsultationPhotoGalleryItemModel extends IConsultationPhotoModel {
  professionalName: string
  appointmentDate: Date
}

export interface IPaginatedConsultationPhotosModel {
  data: IConsultationPhotoGalleryItemModel[]
  total: number
  page: number
  limit: number
}
