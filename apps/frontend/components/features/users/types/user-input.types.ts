import { UserRole } from '@app/shared'

export interface ICreateUserInput {
  fullName: string
  email: string
  password: string
  role: UserRole
}

export interface IUpdateUserInput {
  fullName?: string
  email?: string
  role?: UserRole
}
