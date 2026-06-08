import { UserRole } from '@app/shared'

export interface ICurrentUser {
  id: string
  role: UserRole
  clinicId: string
}
