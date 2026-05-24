import { UserRole } from '@app/shared'

export class LoginResponseDto {
  id: string
  fullName: string
  email: string
  role: UserRole
}
