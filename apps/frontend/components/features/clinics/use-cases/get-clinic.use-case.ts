import { clinicsService } from '../services/clinics.service'
import { toClinicModel } from '../mappers/to-clinic-model'
import type { IClinicModel } from '../types/clinic.types'

export async function getClinicUseCase(id: string): Promise<IClinicModel> {
  const dto = await clinicsService.getById(id)
  return toClinicModel(dto)
}
