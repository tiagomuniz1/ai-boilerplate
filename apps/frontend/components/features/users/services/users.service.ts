import { apiClient } from '@/lib/api-client'
import type { UserResponseDto, PaginatedUsersResponseDto, CreateUserDto, UpdateUserDto } from '@app/shared'

export const userService = {
  getAll: () => apiClient.get<PaginatedUsersResponseDto>('/users'),
  getById: (id: string) => apiClient.get<UserResponseDto>(`/users/${id}`),
  create: (data: CreateUserDto) => apiClient.post<UserResponseDto>('/users', data),
  update: (id: string, data: UpdateUserDto) => apiClient.patch<UserResponseDto>(`/users/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/users/${id}`),
}
