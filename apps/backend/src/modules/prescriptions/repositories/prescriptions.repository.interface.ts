import { QueryRunner } from 'typeorm'
import { PrescriptionSnapshot } from '@app/shared'
import { Prescription } from '../entities/prescription.entity'

export interface CreatePrescriptionData {
  clinicId: string
  appointmentId: string
  patientId: string
  doctorId: string
  snapshot: PrescriptionSnapshot
  issuedAt: Date
}

export abstract class IPrescriptionsRepository {
  abstract findByAppointment(appointmentId: string, clinicId: string): Promise<Prescription[]>
  abstract findById(id: string, clinicId: string): Promise<Prescription | null>
  abstract create(data: CreatePrescriptionData, queryRunner?: QueryRunner): Promise<Prescription>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
