import { userService } from '../services/users.service'
import { toUserModel } from '../mappers/to-user-model.mapper'
import type { IUserModel } from '../types/user-model.types'

export async function listUsersUseCase(): Promise<IUserModel[]> {
  const { data } = await userService.getAll()
  return data.map(toUserModel)
}
