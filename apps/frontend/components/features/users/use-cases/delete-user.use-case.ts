import { userService } from '../services/users.service'

export async function deleteUserUseCase(id: string): Promise<void> {
  return userService.remove(id)
}
