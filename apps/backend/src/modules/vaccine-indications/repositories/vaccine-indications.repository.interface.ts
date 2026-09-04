import { QueryRunner } from 'typeorm'
import { VaccineIndicationSnapshot } from '@app/shared'
import { VaccineIndication } from '../entities/vaccine-indication.entity'

export interface CreateVaccineIndicationData {
  clinicId: string
  appointmentId: string
  patientId: string
  professionalId: string
  snapshot: VaccineIndicationSnapshot
  issuedAt: Date
}

export abstract class IVaccineIndicationsRepository {
  abstract findByAppointment(appointmentId: string, clinicId: string): Promise<VaccineIndication[]>
  abstract findById(id: string, clinicId: string): Promise<VaccineIndication | null>
  abstract create(data: CreateVaccineIndicationData, queryRunner?: QueryRunner): Promise<VaccineIndication>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
