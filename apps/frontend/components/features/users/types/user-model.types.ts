import { UserRole } from '@app/shared'

export interface IUserModel {
  id: string
  fullName: string
  email: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}
