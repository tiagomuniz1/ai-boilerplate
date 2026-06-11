import type { UserRole } from '@app/shared'

export interface ILoginInput {
  email: string
  password: string
}

export interface IAuthUserDto {
  id: string
  fullName: string
  email: string
  role: UserRole
  clinicId: string | null
}

export interface IAuthUserModel {
  id: string
  fullName: string
  email: string
  role: UserRole
  clinicId: string | null
}
