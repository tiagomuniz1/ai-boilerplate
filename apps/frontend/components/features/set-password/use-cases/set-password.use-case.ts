import type { SetPasswordDto } from '@app/shared'
import { setPasswordService } from '../services/set-password.service'

export async function setPasswordUseCase(data: SetPasswordDto): Promise<void> {
  return setPasswordService.setPassword(data)
}
