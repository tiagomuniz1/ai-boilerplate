import type { ValidateSetPasswordTokenResponseDto } from '@app/shared'
import { setPasswordService } from '../services/set-password.service'

export async function validateSetPasswordTokenUseCase(
  token: string,
): Promise<ValidateSetPasswordTokenResponseDto> {
  return setPasswordService.validate(token)
}
