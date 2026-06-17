import { clinicsService } from '../services/clinics.service'
import { toClinicModel } from '../mappers/to-clinic-model'
import type { IClinicModel } from '../types/clinic.types'

export async function uploadClinicLogoDarkUseCase(file: File, clinicId?: string): Promise<IClinicModel> {
  const dto = clinicId
    ? await clinicsService.uploadLogoDarkById(clinicId, file)
    : await clinicsService.uploadLogoDark(file)
  return toClinicModel(dto)
}
