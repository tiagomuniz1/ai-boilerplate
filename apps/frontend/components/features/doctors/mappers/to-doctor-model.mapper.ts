import type { DoctorResponseDto } from '@app/shared'
import type { IDoctorModel } from '../types/doctor-model.types'

export function toDoctorModel(dto: DoctorResponseDto): IDoctorModel {
  return {
    id: dto.id,
    user: {
      id: dto.user.id,
      fullName: dto.user.fullName,
      email: dto.user.email,
      isActive: dto.user.isActive,
    },
    crmNumber: dto.crmNumber,
    specialties: dto.specialties.map((s) => ({ id: s.id, name: s.name })),
    bio: dto.bio,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}
