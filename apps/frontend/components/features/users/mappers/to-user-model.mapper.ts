import type { UserResponseDto } from '@app/shared'
import type { IUserModel } from '../types/user-model.types'

export function toUserModel(dto: UserResponseDto): IUserModel {
  return {
    id: dto.id,
    fullName: dto.fullName,
    email: dto.email,
    role: dto.role,
    isActive: dto.isActive,
    isProfessional: dto.isProfessional,
    isPatient: dto.isPatient,
    councilType: dto.councilType ?? null,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}
