import { UserRole } from '../enums/user-role.enum'

export class UserResponseDto {
  id!: string
  fullName!: string
  email!: string
  role!: UserRole
  isActive!: boolean
  isDoctor!: boolean
  isPatient!: boolean
  createdAt!: Date
  updatedAt!: Date
}
