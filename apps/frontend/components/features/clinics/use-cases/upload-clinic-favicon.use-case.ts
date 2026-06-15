import { clinicsService } from '../services/clinics.service'
import { toClinicModel } from '../mappers/to-clinic-model'
import type { IClinicModel } from '../types/clinic.types'

export async function uploadClinicFaviconUseCase(file: File, clinicId?: string): Promise<IClinicModel> {
  const dto = clinicId
    ? await clinicsService.uploadFaviconById(clinicId, file)
    : await clinicsService.uploadFavicon(file)
  return toClinicModel(dto)
}
