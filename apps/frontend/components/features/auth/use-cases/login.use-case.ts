import { authService } from '../services/auth.service'
import { toAuthUserModel } from '../mappers/to-auth-user-model'
import type { ILoginInput, IAuthUserModel } from '../types/auth.types'

export async function loginUseCase(input: ILoginInput): Promise<IAuthUserModel> {
  const dto = await authService.login(input)
  return toAuthUserModel(dto)
}
