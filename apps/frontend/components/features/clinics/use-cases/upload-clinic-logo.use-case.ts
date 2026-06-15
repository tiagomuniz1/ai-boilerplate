import { clinicsService } from '../services/clinics.service'
import { toClinicModel } from '../mappers/to-clinic-model'
import type { IClinicModel } from '../types/clinic.types'

export async function uploadClinicLogoUseCase(file: File, clinicId?: string): Promise<IClinicModel> {
  const dto = clinicId
    ? await clinicsService.uploadLogoById(clinicId, file)
    : await clinicsService.uploadLogo(file)
  return toClinicModel(dto)
}
