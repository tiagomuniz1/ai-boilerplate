import { QueryRunner } from 'typeorm'
import { MedicationSource } from '@app/shared'
import { Medication } from '../entities/medication.entity'

export interface CreateMedicationData {
  name: string
  activeIngredient: string | null
  regulatoryCategory: string | null
  therapeuticClass: string | null
  holderCompany: string | null
  registrationNumber: string | null
  registrationStatus: string | null
  source: MedicationSource
  importHash: string | null
  isActive: boolean
}

export interface UpdateMedicationData {
  name?: string
  activeIngredient?: string | null
  regulatoryCategory?: string | null
  therapeuticClass?: string | null
  holderCompany?: string | null
  registrationNumber?: string | null
  registrationStatus?: string | null
  isActive?: boolean
}

export abstract class IMedicationsRepository {
  abstract findAll(
    page: number,
    limit: number,
    search: string | undefined,
    includeInactive: boolean,
  ): Promise<[Medication[], number]>
  abstract findById(id: string): Promise<Medication | null>
  abstract create(data: CreateMedicationData, queryRunner?: QueryRunner): Promise<Medication>
  abstract update(id: string, data: UpdateMedicationData, queryRunner?: QueryRunner): Promise<Medication>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
  abstract bulkUpsert(rows: CreateMedicationData[], queryRunner?: QueryRunner): Promise<void>
}
