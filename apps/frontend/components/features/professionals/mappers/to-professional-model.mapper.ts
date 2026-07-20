import type { ProfessionalResponseDto } from '@app/shared'
import type { IProfessionalModel } from '../types/professional-model.types'

export function toProfessionalModel(dto: ProfessionalResponseDto): IProfessionalModel {
  return {
    id: dto.id,
    user: {
      id: dto.user.id,
      fullName: dto.user.fullName,
      email: dto.user.email,
      isActive: dto.user.isActive,
    },
    registrations: dto.registrations.map((c) => ({
      id: c.id,
      councilType: c.councilType,
      number: c.number,
      state: c.state,
      isPrimary: c.isPrimary,
    })),
    specialties: dto.specialties.map((s) => ({ id: s.id, name: s.name, registryNumber: s.registryNumber })),
    bio: dto.bio,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}
