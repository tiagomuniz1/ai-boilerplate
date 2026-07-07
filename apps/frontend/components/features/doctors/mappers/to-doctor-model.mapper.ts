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
    crms: dto.crms.map((c) => ({ id: c.id, number: c.number, state: c.state, isPrimary: c.isPrimary })),
    specialties: dto.specialties.map((s) => ({ id: s.id, name: s.name, rqe: s.rqe })),
    bio: dto.bio,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}
