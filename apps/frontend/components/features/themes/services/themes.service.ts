import { apiClient } from '@/lib/api-client'
import type { ThemeResponseDto, PaginatedThemesResponseDto } from '@app/shared'
import type { ICreateThemeInput, IUpdateThemeInput } from '../types/theme-input.types'

export const themesService = {
  getAll: (page = 1, limit = 20) =>
    apiClient.get<PaginatedThemesResponseDto>(`/themes?page=${page}&limit=${limit}`),
  getById: (id: string) => apiClient.get<ThemeResponseDto>(`/themes/${id}`),
  getActive: () => apiClient.get<ThemeResponseDto | null>('/themes/active'),
  create: (data: ICreateThemeInput) => apiClient.post<ThemeResponseDto>('/themes', data),
  update: (id: string, data: IUpdateThemeInput) =>
    apiClient.patch<ThemeResponseDto>(`/themes/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/themes/${id}`),
}
