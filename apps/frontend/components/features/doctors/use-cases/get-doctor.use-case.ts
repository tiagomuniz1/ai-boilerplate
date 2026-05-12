import { doctorsService } from '../services/doctors.service'
import { toDoctorModel } from '../mappers/to-doctor-model.mapper'
import type { IDoctorModel } from '../types/doctor-model.types'

export async function getDoctorUseCase(id: string): Promise<IDoctorModel> {
  const dto = await doctorsService.getById(id)
  return toDoctorModel(dto)
}
