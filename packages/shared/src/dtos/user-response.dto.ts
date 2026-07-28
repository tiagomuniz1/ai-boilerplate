import { UserRole } from '../enums/user-role.enum'
import { CouncilType } from '../enums/council-type.enum'

export class UserResponseDto {
  id!: string
  fullName!: string
  email!: string
  role!: UserRole
  isActive!: boolean
  isProfessional!: boolean
  isPatient!: boolean
  councilType?: CouncilType | null
  createdAt!: Date
  updatedAt!: Date
}
