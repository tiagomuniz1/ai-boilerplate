import { clinicsService } from '../services/clinics.service'
import { toClinicModel } from '../mappers/to-clinic-model'
import type { IUpdateClinicInput, IClinicModel } from '../types/clinic.types'

export async function updateClinicUseCase(id: string, input: IUpdateClinicInput): Promise<IClinicModel> {
  const dto = await clinicsService.update(id, input)
  return toClinicModel(dto)
}
