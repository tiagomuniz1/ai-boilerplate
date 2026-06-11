import { apiClient } from '@/lib/api-client'
import type {
  ClinicResponseDto,
  PaginatedClinicsResponseDto,
  RegisterClinicDto,
  RegisterClinicResponseDto,
} from '@app/shared'
import type { IClinicListParams, ICreateClinicInput, IUpdateClinicInput } from '../types/clinic.types'

export const clinicsService = {
  getAll: (params?: IClinicListParams) => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    const query = searchParams.toString()
    return apiClient.get<PaginatedClinicsResponseDto>(
      `/clinics${query ? `?${query}` : ''}`,
    )
  },
  getById: (id: string) => apiClient.get<ClinicResponseDto>(`/clinics/${id}`),
  getMe: () => apiClient.get<ClinicResponseDto>('/clinics/me'),
  create: (data: ICreateClinicInput) => apiClient.post<ClinicResponseDto>('/clinics', data),
  update: (id: string, data: IUpdateClinicInput) =>
    apiClient.patch<ClinicResponseDto>(`/clinics/${id}`, data),
  register: (data: RegisterClinicDto) =>
    apiClient.post<RegisterClinicResponseDto>('/clinics/register', data),
}
