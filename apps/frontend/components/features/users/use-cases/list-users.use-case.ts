import { userService } from '../services/users.service'
import { toUserModel } from '../mappers/to-user-model.mapper'
import type { IUserModel } from '../types/user-model.types'
import type { IUserListParams } from '../types/user-input.types'

export async function listUsersUseCase(params?: IUserListParams): Promise<IUserModel[]> {
  const { data } = await userService.getAll(params)
  return data.map(toUserModel)
}
