import { clinicsService } from '../services/clinics.service'
import { toClinicModel } from '../mappers/to-clinic-model'
import type { IClinicModel } from '../types/clinic.types'

export async function getClinicBySlugUseCase(slug: string): Promise<IClinicModel> {
  const dto = await clinicsService.getBySlug(slug)
  return toClinicModel(dto)
}
