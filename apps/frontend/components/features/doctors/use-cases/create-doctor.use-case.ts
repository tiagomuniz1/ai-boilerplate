import { doctorsService } from '../services/doctors.service'
import { toDoctorModel } from '../mappers/to-doctor-model.mapper'
import { toCreateDoctorDto } from '../mappers/to-create-doctor-dto.mapper'
import type { IDoctorModel } from '../types/doctor-model.types'
import type { ICreateDoctorInput } from '../types/doctor-input.types'

export async function createDoctorUseCase(input: ICreateDoctorInput): Promise<IDoctorModel> {
  const dto = await doctorsService.create(toCreateDoctorDto(input))
  return toDoctorModel(dto)
}
