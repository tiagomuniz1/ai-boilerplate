import type { UpdateDoctorDto } from '@app/shared'
import type { IUpdateDoctorInput } from '../types/doctor-input.types'

export function toUpdateDoctorDto(input: IUpdateDoctorInput): UpdateDoctorDto {
  return {
    crmNumber: input.crmNumber,
    specialty: input.specialty,
    bio: input.bio,
  }
}
