import { QueryRunner } from 'typeorm'
import { VaccineDecision } from '@app/shared'
import { VaccineDecisionRecord } from '../entities/vaccine-decision.entity'

export interface CreateDecisionData {
  clinicId: string
  patientId: string
  vaccineId: string
  decision: VaccineDecision
  reason: string | null
  decidedByProfessionalId: string
}

export abstract class IVaccineDecisionsRepository {
  abstract findByPatient(patientId: string, clinicId: string): Promise<VaccineDecisionRecord[]>
  abstract findByPatientAndVaccine(
    patientId: string,
    vaccineId: string,
    clinicId: string,
  ): Promise<VaccineDecisionRecord | null>
  abstract create(data: CreateDecisionData, queryRunner?: QueryRunner): Promise<VaccineDecisionRecord>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
