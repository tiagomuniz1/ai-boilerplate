import { clinicsService } from '../services/clinics.service'
import { toClinicModel } from '../mappers/to-clinic-model'
import type { IClinicModel } from '../types/clinic.types'

export async function getCurrentClinicUseCase(): Promise<IClinicModel> {
  const dto = await clinicsService.getMe()
  return toClinicModel(dto)
}
