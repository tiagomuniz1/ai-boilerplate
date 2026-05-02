import type { UpdateUserDto } from '@app/shared'
import type { IUpdateUserInput } from '../types/user-input.types'

export function toUpdateUserDto(input: IUpdateUserInput): UpdateUserDto {
  return {
    fullName: input.fullName,
    email: input.email,
    role: input.role,
  }
}
