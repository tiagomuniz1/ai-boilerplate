import { apiClient } from '@/lib/api-client'
import type { CreateVaccineIndicationDto, VaccineIndicationResponseDto } from '@app/shared'

export const vaccineIndicationsService = {
  getByAppointment: (appointmentId: string) =>
    apiClient.get<VaccineIndicationResponseDto[]>(`/vaccine-indications?appointmentId=${appointmentId}`),

  getById: (id: string) => apiClient.get<VaccineIndicationResponseDto>(`/vaccine-indications/${id}`),

  create: (data: CreateVaccineIndicationDto) =>
    apiClient.post<VaccineIndicationResponseDto>('/vaccine-indications', data),

  remove: (id: string) => apiClient.delete<void>(`/vaccine-indications/${id}`),

  downloadPdf: (id: string) => apiClient.getBlob(`/vaccine-indications/${id}/pdf`),
}
