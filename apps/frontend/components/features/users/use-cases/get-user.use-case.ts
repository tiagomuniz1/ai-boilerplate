import { userService } from '../services/users.service'
import { toUserModel } from '../mappers/to-user-model.mapper'
import type { IUserModel } from '../types/user-model.types'

export async function getUserUseCase(id: string): Promise<IUserModel> {
  const dto = await userService.getById(id)
  return toUserModel(dto)
}
