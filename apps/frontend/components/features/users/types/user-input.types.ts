import { UserRole } from '@app/shared'

export interface ICreateUserInput {
  fullName: string
  email: string
  password: string
  role: UserRole
  clinicId?: string
}

export interface IUpdateUserInput {
  fullName?: string
  email?: string
  role?: UserRole
  isActive?: boolean
}

export interface IUserListParams {
  search?: string
  page?: number
  limit?: number
}
