import { userService } from '../services/users.service'
import { toUserModel } from '../mappers/to-user-model.mapper'
import { toCreateUserDto } from '../mappers/to-create-user-dto.mapper'
import type { IUserModel } from '../types/user-model.types'
import type { ICreateUserInput } from '../types/user-input.types'

export async function createUserUseCase(input: ICreateUserInput): Promise<IUserModel> {
  const dto = await userService.create(toCreateUserDto(input))
  return toUserModel(dto)
}
