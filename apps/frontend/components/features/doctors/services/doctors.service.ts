import { apiClient } from '@/lib/api-client'
import type {
  DoctorResponseDto,
  PaginatedDoctorsResponseDto,
  CreateDoctorDto,
  UpdateDoctorDto,
} from '@app/shared'
import type { IDoctorListParams } from '../types/doctor-input.types'

export const doctorsService = {
  getAll: (params?: IDoctorListParams) => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    const query = searchParams.toString()
    return apiClient.get<PaginatedDoctorsResponseDto>(
      `/doctors${query ? `?${query}` : ''}`,
    )
  },
  getById: (id: string) => apiClient.get<DoctorResponseDto>(`/doctors/${id}`),
  create: (data: CreateDoctorDto) => apiClient.post<DoctorResponseDto>('/doctors', data),
  update: (id: string, data: UpdateDoctorDto) =>
    apiClient.patch<DoctorResponseDto>(`/doctors/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/doctors/${id}`),
}
