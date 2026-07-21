import { apiClient } from '@/lib/api-client'
import type {
  CreatePrescriptionTemplateDto,
  PrescriptionTemplateResponseDto,
  UpdatePrescriptionTemplateDto,
} from '@app/shared'

export const prescriptionTemplatesService = {
  getAll: (params?: { professionalId?: string }) => {
    const query = params?.professionalId ? `?professionalId=${params.professionalId}` : ''
    return apiClient.get<PrescriptionTemplateResponseDto[]>(`/prescription-templates${query}`)
  },

  getById: (id: string) =>
    apiClient.get<PrescriptionTemplateResponseDto>(`/prescription-templates/${id}`),

  create: (data: CreatePrescriptionTemplateDto) =>
    apiClient.post<PrescriptionTemplateResponseDto>('/prescription-templates', data),

  update: (id: string, data: UpdatePrescriptionTemplateDto) =>
    apiClient.patch<PrescriptionTemplateResponseDto>(`/prescription-templates/${id}`, data),

  remove: (id: string) =>
    apiClient.delete<void>(`/prescription-templates/${id}`),
}
