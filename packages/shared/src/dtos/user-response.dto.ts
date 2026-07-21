import { UserRole } from '../enums/user-role.enum'

export class UserResponseDto {
  id!: string
  fullName!: string
  email!: string
  role!: UserRole
  isActive!: boolean
  isProfessional!: boolean
  isPatient!: boolean
  createdAt!: Date
  updatedAt!: Date
}
