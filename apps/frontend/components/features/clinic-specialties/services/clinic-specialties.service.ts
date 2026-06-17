import { apiClient } from '@/lib/api-client'
import type { ClinicSpecialtyResponseDto, PaginatedClinicSpecialtiesResponseDto } from '@app/shared'
import type { IClinicSpecialtyListParams } from '../types/clinic-specialty.types'

export const clinicSpecialtiesService = {
  getAll: (clinicId: string, params?: IClinicSpecialtyListParams) => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    const query = searchParams.toString()
    return apiClient.get<PaginatedClinicSpecialtiesResponseDto>(
      `/clinics/${clinicId}/specialties${query ? `?${query}` : ''}`,
    )
  },
  link: (clinicId: string, specialtyId: string) =>
    apiClient.post<ClinicSpecialtyResponseDto>(`/clinics/${clinicId}/specialties/${specialtyId}`),
  unlink: (clinicId: string, specialtyId: string) =>
    apiClient.delete<void>(`/clinics/${clinicId}/specialties/${specialtyId}`),
}
