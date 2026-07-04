import type { ExamRequestResponseDto, ExamResultResponseDto } from '@app/shared'
import type { IExamRequestModel, IExamResultModel } from '../types/exam-request-model.types'

function toExamResultModel(dto: ExamResultResponseDto): IExamResultModel {
  return {
    id: dto.id,
    fileName: dto.fileName,
    mimeType: dto.mimeType,
    fileSizeBytes: dto.fileSizeBytes,
    createdAt: new Date(dto.createdAt as unknown as string),
  }
}

export function toExamRequestModel(dto: ExamRequestResponseDto): IExamRequestModel {
  return {
    id: dto.id,
    appointmentId: dto.appointmentId,
    patientId: dto.patientId,
    patientName: dto.patientName,
    doctorId: dto.doctorId,
    doctorName: dto.doctorName,
    items: dto.items.map((item) => ({
      name: item.name,
      observations: item.observations,
    })),
    notes: dto.notes,
    status: dto.status,
    results: dto.results.map(toExamResultModel),
    issuedAt: new Date(dto.issuedAt as unknown as string),
    createdAt: new Date(dto.createdAt as unknown as string),
  }
}
