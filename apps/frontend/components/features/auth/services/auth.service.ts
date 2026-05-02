import { apiClient } from '@/lib/api-client'
import type { ILoginInput, IAuthUserDto } from '../types/auth.types'

export const authService = {
  login: (data: ILoginInput) => apiClient.post<IAuthUserDto>('/auth/login', data),
  logout: () => apiClient.post<void>('/auth/logout'),
  getMe: () => apiClient.get<IAuthUserDto>('/auth/me'),
}
