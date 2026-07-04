import { ExamRequestStatus } from '../enums/exam-request-status.enum'
import { ExamResultResponseDto } from './exam-result-response.dto'

export class ExamRequestItemResponseDto {
  name!: string
  observations!: string | null
}

export class ExamRequestResponseDto {
  id!: string
  appointmentId!: string
  patientId!: string
  patientName!: string
  doctorId!: string
  doctorName!: string
  items!: ExamRequestItemResponseDto[]
  notes!: string | null
  status!: ExamRequestStatus
  results!: ExamResultResponseDto[]
  issuedAt!: Date
  createdAt!: Date
}
