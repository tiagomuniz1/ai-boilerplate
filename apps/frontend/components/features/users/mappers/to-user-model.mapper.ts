import type { UserResponseDto } from '@app/shared'
import type { IUserModel } from '../types/user-model.types'

export function toUserModel(dto: UserResponseDto): IUserModel {
  return {
    id: dto.id,
    fullName: dto.fullName,
    email: dto.email,
    role: dto.role,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}
