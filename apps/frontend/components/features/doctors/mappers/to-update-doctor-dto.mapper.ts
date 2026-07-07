import type { UpdateDoctorDto } from '@app/shared'
import type { IUpdateDoctorInput } from '../types/doctor-input.types'

export function toUpdateDoctorDto(input: IUpdateDoctorInput): UpdateDoctorDto {
  return {
    crms: input.crms,
    specialties: input.specialties,
    bio: input.bio,
    isActive: input.isActive,
  }
}
