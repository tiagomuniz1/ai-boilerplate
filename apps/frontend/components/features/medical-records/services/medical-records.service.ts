import { apiClient } from '@/lib/api-client'
import type {
  MedicalRecordResponseDto,
  PaginatedMedicalRecordsResponseDto,
  CreateMedicalRecordDto,
  UpdateMedicalRecordDto,
} from '@app/shared'

export interface IPatientHistoryParams {
  page?: number
  limit?: number
}

export const medicalRecordsService = {
  getById: (id: string) =>
    apiClient.get<MedicalRecordResponseDto>(`/medical-records/${id}`),

  getByAppointment: (appointmentId: string) =>
    apiClient.get<MedicalRecordResponseDto | null>(`/medical-records/by-appointment/${appointmentId}`),

  listByPatient: (patientId: string, params?: IPatientHistoryParams) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    const query = searchParams.toString()
    return apiClient.get<PaginatedMedicalRecordsResponseDto>(
      `/medical-records/patient/${patientId}${query ? `?${query}` : ''}`,
    )
  },

  create: (data: CreateMedicalRecordDto) =>
    apiClient.post<MedicalRecordResponseDto>('/medical-records', data),

  update: (id: string, data: UpdateMedicalRecordDto) =>
    apiClient.patch<MedicalRecordResponseDto>(`/medical-records/${id}`, data),
}
