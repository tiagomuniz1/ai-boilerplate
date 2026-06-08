import { clinicsService } from '../services/clinics.service'
import { toClinicModel } from '../mappers/to-clinic-model'
import type { ICreateClinicInput, IClinicModel } from '../types/clinic.types'

export async function createClinicUseCase(input: ICreateClinicInput): Promise<IClinicModel> {
  const dto = await clinicsService.create(input)
  return toClinicModel(dto)
}
