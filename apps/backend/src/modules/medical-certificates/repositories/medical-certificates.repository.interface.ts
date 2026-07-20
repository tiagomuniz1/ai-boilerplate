import { QueryRunner } from 'typeorm'
import { MedicalCertificateSnapshot } from '@app/shared'
import { MedicalCertificate } from '../entities/medical-certificate.entity'

export interface CreateMedicalCertificateData {
  clinicId: string
  appointmentId: string
  patientId: string
  professionalId: string
  snapshot: MedicalCertificateSnapshot
  issuedAt: Date
}

export abstract class IMedicalCertificatesRepository {
  abstract findByAppointment(appointmentId: string, clinicId: string): Promise<MedicalCertificate[]>
  abstract findById(id: string, clinicId: string): Promise<MedicalCertificate | null>
  abstract create(data: CreateMedicalCertificateData, queryRunner?: QueryRunner): Promise<MedicalCertificate>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
