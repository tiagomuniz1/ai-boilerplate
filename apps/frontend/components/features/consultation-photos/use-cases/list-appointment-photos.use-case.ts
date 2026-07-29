import { consultationPhotosService } from '../services/consultation-photos.service'
import { toConsultationPhotoModel } from '../mappers/to-consultation-photo-model.mapper'
import type { IConsultationPhotoModel } from '../types/consultation-photo-model.types'

export async function listAppointmentPhotosUseCase(appointmentId: string): Promise<IConsultationPhotoModel[]> {
  const dtos = await consultationPhotosService.getByAppointment(appointmentId)
  return dtos.map(toConsultationPhotoModel)
}
