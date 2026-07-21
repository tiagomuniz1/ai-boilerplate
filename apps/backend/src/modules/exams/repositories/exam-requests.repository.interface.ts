import { QueryRunner } from 'typeorm'
import { ExamRequestSnapshot, ExamRequestStatus } from '@app/shared'
import { ExamRequest } from '../entities/exam-request.entity'

export interface CreateExamRequestData {
  clinicId: string
  appointmentId: string
  patientId: string
  professionalId: string
  snapshot: ExamRequestSnapshot
  issuedAt: Date
}

export abstract class IExamRequestsRepository {
  abstract findByAppointment(appointmentId: string, clinicId: string): Promise<ExamRequest[]>
  abstract findById(id: string, clinicId: string): Promise<ExamRequest | null>
  abstract create(data: CreateExamRequestData, queryRunner?: QueryRunner): Promise<ExamRequest>
  abstract updateStatus(id: string, status: ExamRequestStatus, queryRunner?: QueryRunner): Promise<void>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
