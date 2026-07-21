import { QueryRunner } from 'typeorm'
import { MedicalRecord } from '../entities/medical-record.entity'
import { MedicalRecordTemplateField } from '../../medical-record-templates/entities/medical-record-template.entity'

export interface CreateMedicalRecordData {
  clinicId: string
  appointmentId: string
  patientId: string
  professionalId: string
  specialtyId: string | null
  templateId: string
  templateSchemaSnapshot: MedicalRecordTemplateField[]
  data: Record<string, unknown>
  notes: string | null
}

export interface UpdateMedicalRecordData {
  data?: Record<string, unknown>
  notes?: string | null
}

export abstract class IMedicalRecordsRepository {
  abstract findById(id: string, clinicId: string): Promise<MedicalRecord | null>
  abstract findByAppointment(appointmentId: string, clinicId: string): Promise<MedicalRecord | null>
  abstract findByPatient(
    clinicId: string,
    patientId: string,
    page: number,
    limit: number,
    professionalId?: string,
  ): Promise<[MedicalRecord[], number]>
  abstract create(data: CreateMedicalRecordData, queryRunner?: QueryRunner): Promise<MedicalRecord>
  abstract update(id: string, data: UpdateMedicalRecordData, clinicId: string, queryRunner?: QueryRunner): Promise<MedicalRecord>
  abstract delete(id: string, clinicId: string, queryRunner?: QueryRunner): Promise<void>
}
