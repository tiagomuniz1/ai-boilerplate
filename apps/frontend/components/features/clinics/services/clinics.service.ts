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
  getBySlug: (slug: string) => apiClient.get<ClinicResponseDto>(`/clinics/slug/${slug}`),
  getMe: () => apiClient.get<ClinicResponseDto>('/clinics/me'),
  create: (data: ICreateClinicInput) => apiClient.post<ClinicResponseDto>('/clinics', data),
  update: (id: string, data: IUpdateClinicInput) =>
    apiClient.patch<ClinicResponseDto>(`/clinics/${id}`, data),
  register: (data: RegisterClinicDto) =>
    apiClient.post<RegisterClinicResponseDto>('/clinics/register', data),
  uploadLogo: (file: File) => {
    const formData = new FormData()
    formData.append('logo', file)
    return apiClient.post<ClinicResponseDto>('/clinics/me/logo', formData)
  },
  uploadLogoById: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('logo', file)
    return apiClient.post<ClinicResponseDto>(`/clinics/${id}/logo`, formData)
  },
  uploadLogoDark: (file: File) => {
    const formData = new FormData()
    formData.append('logo-dark', file)
    return apiClient.post<ClinicResponseDto>('/clinics/me/logo-dark', formData)
  },
  uploadLogoDarkById: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('logo-dark', file)
    return apiClient.post<ClinicResponseDto>(`/clinics/${id}/logo-dark`, formData)
  },
  uploadFavicon: (file: File) => {
    const formData = new FormData()
    formData.append('favicon', file)
    return apiClient.post<ClinicResponseDto>('/clinics/me/favicon', formData)
  },
  uploadFaviconById: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('favicon', file)
    return apiClient.post<ClinicResponseDto>(`/clinics/${id}/favicon`, formData)
  },
}
