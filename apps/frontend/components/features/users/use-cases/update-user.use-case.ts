import { userService } from '../services/users.service'
import { toUserModel } from '../mappers/to-user-model.mapper'
import { toUpdateUserDto } from '../mappers/to-update-user-dto.mapper'
import type { IUserModel } from '../types/user-model.types'
import type { IUpdateUserInput } from '../types/user-input.types'

export async function updateUserUseCase(id: string, input: IUpdateUserInput): Promise<IUserModel> {
  const dto = await userService.update(id, toUpdateUserDto(input))
  return toUserModel(dto)
}
