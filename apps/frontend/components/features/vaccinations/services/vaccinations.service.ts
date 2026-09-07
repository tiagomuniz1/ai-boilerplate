import { apiClient } from '@/lib/api-client'
import type {
  CreateVaccinationDto,
  PaginatedVaccinationsResponseDto,
  UpdateVaccinationDto,
  VaccinationResponseDto,
} from '@app/shared'
import type { IVaccinationListParams } from '../types/vaccination-model.types'

export const vaccinationsService = {
  getAll: (params: IVaccinationListParams): Promise<PaginatedVaccinationsResponseDto> => {
    const sp = new URLSearchParams()
    if (params.patientId) sp.set('patientId', params.patientId)
    if (params.appointmentId) sp.set('appointmentId', params.appointmentId)
    if (params.page) sp.set('page', String(params.page))
    if (params.limit) sp.set('limit', String(params.limit))
    return apiClient.get<PaginatedVaccinationsResponseDto>(`/vaccinations?${sp.toString()}`)
  },
  create: (data: CreateVaccinationDto) =>
    apiClient.post<VaccinationResponseDto>('/vaccinations', data),
  update: (id: string, data: UpdateVaccinationDto) =>
    apiClient.patch<VaccinationResponseDto>(`/vaccinations/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/vaccinations/${id}`),
}
