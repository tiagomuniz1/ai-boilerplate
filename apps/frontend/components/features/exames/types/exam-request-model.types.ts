import type { ExamRequestStatus } from '@app/shared'

export interface IExamResultModel {
  id: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
  createdAt: Date
}

export interface IExamRequestItemModel {
  name: string
  observations: string | null
}

export interface IExamRequestModel {
  id: string
  appointmentId: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  items: IExamRequestItemModel[]
  notes: string | null
  status: ExamRequestStatus
  results: IExamResultModel[]
  issuedAt: Date
  createdAt: Date
}
