import { doctorsService } from '../services/doctors.service'
import { toDoctorModel } from '../mappers/to-doctor-model.mapper'
import { toUpdateDoctorDto } from '../mappers/to-update-doctor-dto.mapper'
import type { IDoctorModel } from '../types/doctor-model.types'
import type { IUpdateDoctorInput } from '../types/doctor-input.types'

export async function updateDoctorUseCase(
  id: string,
  input: IUpdateDoctorInput,
): Promise<IDoctorModel> {
  const dto = await doctorsService.update(id, toUpdateDoctorDto(input))
  return toDoctorModel(dto)
}
