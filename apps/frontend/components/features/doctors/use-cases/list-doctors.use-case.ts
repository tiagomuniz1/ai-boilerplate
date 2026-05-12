import { doctorsService } from '../services/doctors.service'
import { toDoctorModel } from '../mappers/to-doctor-model.mapper'
import type { IDoctorModel } from '../types/doctor-model.types'
import type { IDoctorListParams } from '../types/doctor-input.types'

export async function listDoctorsUseCase(params?: IDoctorListParams): Promise<IDoctorModel[]> {
  const { data } = await doctorsService.getAll(params)
  return data.map(toDoctorModel)
}
