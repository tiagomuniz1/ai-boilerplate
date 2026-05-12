import type { DoctorResponseDto } from '@app/shared'
import type { IDoctorModel } from '../types/doctor-model.types'

export function toDoctorModel(dto: DoctorResponseDto): IDoctorModel {
  return {
    id: dto.id,
    user: {
      id: dto.user.id,
      fullName: dto.user.fullName,
      email: dto.user.email,
    },
    crmNumber: dto.crmNumber,
    specialty: dto.specialty,
    bio: dto.bio,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}
