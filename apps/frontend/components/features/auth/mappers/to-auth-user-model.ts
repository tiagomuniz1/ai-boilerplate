import type { IAuthUserDto, IAuthUserModel } from '../types/auth.types'

export function toAuthUserModel(dto: IAuthUserDto): IAuthUserModel {
  return {
    id: dto.id,
    fullName: dto.fullName,
    email: dto.email,
  }
}
