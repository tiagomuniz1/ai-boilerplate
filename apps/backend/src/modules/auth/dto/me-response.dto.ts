import { UserRole } from '@app/shared'

export class MeResponseDto {
  id: string
  fullName: string
  email: string
  role: UserRole
  clinicId: string | null
}
