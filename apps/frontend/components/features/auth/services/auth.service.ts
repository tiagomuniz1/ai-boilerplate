import { apiClient } from '@/lib/api-client'
import type { ILoginInput, IAuthUserDto } from '../types/auth.types'

export const authService = {
  login: (data: ILoginInput) => apiClient.post<IAuthUserDto>('/auth/login', data),
  logout: (slug?: string) => apiClient.post<void>('/auth/logout', slug ? { slug } : undefined),
  getMe: () => apiClient.get<IAuthUserDto>('/auth/me'),
}
