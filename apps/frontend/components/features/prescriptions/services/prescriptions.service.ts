import { apiClient } from '@/lib/api-client'
import type { CreatePrescriptionDto, PrescriptionResponseDto } from '@app/shared'

export const prescriptionsService = {
  getByAppointment: (appointmentId: string) =>
    apiClient.get<PrescriptionResponseDto[]>(`/prescriptions?appointmentId=${appointmentId}`),

  getById: (id: string) =>
    apiClient.get<PrescriptionResponseDto>(`/prescriptions/${id}`),

  create: (data: CreatePrescriptionDto) =>
    apiClient.post<PrescriptionResponseDto>('/prescriptions', data),

  remove: (id: string) =>
    apiClient.delete<void>(`/prescriptions/${id}`),

  downloadPdf: (id: string) =>
    apiClient.getBlob(`/prescriptions/${id}/pdf`),
}
