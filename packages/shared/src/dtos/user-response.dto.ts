import { UserRole } from '../enums/user-role.enum'

export class UserResponseDto {
  id: string
  fullName: string
  email: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}
