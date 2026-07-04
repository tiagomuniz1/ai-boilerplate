import { apiClient } from '@/lib/api-client'
import type { CreateExamRequestDto, ExamRequestResponseDto } from '@app/shared'

export const examsService = {
  getByAppointment: (appointmentId: string) =>
    apiClient.get<ExamRequestResponseDto[]>(`/exam-requests?appointmentId=${appointmentId}`),

  getById: (id: string) =>
    apiClient.get<ExamRequestResponseDto>(`/exam-requests/${id}`),

  create: (data: CreateExamRequestDto) =>
    apiClient.post<ExamRequestResponseDto>('/exam-requests', data),

  remove: (id: string) =>
    apiClient.delete<void>(`/exam-requests/${id}`),

  downloadPdf: (id: string) =>
    apiClient.getBlob(`/exam-requests/${id}/pdf`),

  addResult: (examRequestId: string, files: File[]) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    return apiClient.post<ExamRequestResponseDto>(`/exam-requests/${examRequestId}/results`, formData)
  },

  removeResult: (resultId: string) =>
    apiClient.delete<void>(`/exam-results/${resultId}`),

  downloadResultFile: (resultId: string) =>
    apiClient.getBlob(`/exam-results/${resultId}/file`),
}
