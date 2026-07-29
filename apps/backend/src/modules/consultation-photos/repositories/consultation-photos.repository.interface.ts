import { QueryRunner } from 'typeorm'
import { ConsultationPhoto } from '../entities/consultation-photo.entity'

export interface CreateConsultationPhotoData {
  id: string
  clinicId: string
  appointmentId: string
  patientId: string
  professionalId: string
  filePath: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
  uploadedByUserId: string
}

// Shape returned by findByPatient's query-builder join — not a TypeORM entity.
export type ConsultationPhotoWithProfessionalName = ConsultationPhoto & {
  professionalName: string
  appointmentDate: Date
}

export abstract class IConsultationPhotosRepository {
  abstract findByAppointment(appointmentId: string, clinicId: string): Promise<ConsultationPhoto[]>
  abstract findByPatient(
    clinicId: string,
    patientId: string,
    page: number,
    limit: number,
    professionalId?: string,
  ): Promise<[ConsultationPhotoWithProfessionalName[], number]>
  abstract findById(id: string, clinicId: string): Promise<ConsultationPhoto | null>
  abstract create(data: CreateConsultationPhotoData, queryRunner?: QueryRunner): Promise<ConsultationPhoto>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
