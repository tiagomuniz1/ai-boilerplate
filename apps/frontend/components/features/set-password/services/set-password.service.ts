import { apiClient } from '@/lib/api-client'
import type { SetPasswordDto, ValidateSetPasswordTokenResponseDto } from '@app/shared'

export const setPasswordService = {
  validate: (token: string): Promise<ValidateSetPasswordTokenResponseDto> =>
    apiClient.get(`/auth/set-password/validate?token=${encodeURIComponent(token)}`),
  setPassword: (data: SetPasswordDto): Promise<void> =>
    apiClient.post('/auth/set-password', data),
}
