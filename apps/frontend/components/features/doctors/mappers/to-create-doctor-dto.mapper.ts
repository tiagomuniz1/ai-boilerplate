import type { CreateDoctorDto } from '@app/shared'
import type { ICreateDoctorInput } from '../types/doctor-input.types'

export function toCreateDoctorDto(input: ICreateDoctorInput): CreateDoctorDto {
  return {
    userId: input.userId,
    crmNumber: input.crmNumber,
    specialtyIds: input.specialtyIds,
    bio: input.bio,
  }
}
