import type { CreateUserDto } from '@app/shared'
import type { ICreateUserInput } from '../types/user-input.types'

export function toCreateUserDto(input: ICreateUserInput): CreateUserDto {
  return {
    fullName: input.fullName,
    email: input.email,
    password: input.password,
    role: input.role,
  }
}
