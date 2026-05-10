import { apiClient } from '@/lib/api-client'
import type { UserResponseDto, PaginatedUsersResponseDto, CreateUserDto, UpdateUserDto } from '@app/shared'
import type { IUserListParams } from '../types/user-input.types'

export const userService = {
  getAll: (params?: IUserListParams) => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    const query = searchParams.toString()
    return apiClient.get<PaginatedUsersResponseDto>(`/users${query ? `?${query}` : ''}`)
  },
  getById: (id: string) => apiClient.get<UserResponseDto>(`/users/${id}`),
  create: (data: CreateUserDto) => apiClient.post<UserResponseDto>('/users', data),
  update: (id: string, data: UpdateUserDto) => apiClient.patch<UserResponseDto>(`/users/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/users/${id}`),
}
