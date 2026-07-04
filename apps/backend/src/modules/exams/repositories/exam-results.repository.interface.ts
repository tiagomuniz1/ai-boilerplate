import { QueryRunner } from 'typeorm'
import { ExamResult } from '../entities/exam-result.entity'

export interface CreateExamResultData {
  id: string
  clinicId: string
  examRequestId: string
  filePath: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
  uploadedByUserId: string
}

export abstract class IExamResultsRepository {
  abstract findByExamRequestIds(examRequestIds: string[], clinicId: string): Promise<ExamResult[]>
  abstract findById(id: string, clinicId: string): Promise<ExamResult | null>
  abstract countActiveByExamRequest(examRequestId: string, queryRunner?: QueryRunner): Promise<number>
  abstract create(data: CreateExamResultData, queryRunner?: QueryRunner): Promise<ExamResult>
  abstract deleteByExamRequestId(examRequestId: string, queryRunner?: QueryRunner): Promise<void>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
