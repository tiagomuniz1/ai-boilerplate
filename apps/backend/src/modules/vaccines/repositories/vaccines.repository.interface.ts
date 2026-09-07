import { QueryRunner } from 'typeorm'
import { Vaccine } from '../entities/vaccine.entity'

export interface CreateVaccineData {
  name: string
  abbreviation: string | null
  preventedDiseases: string | null
  isActive: boolean
}

export interface UpdateVaccineData {
  name?: string
  abbreviation?: string | null
  preventedDiseases?: string | null
  isActive?: boolean
}

export abstract class IVaccinesRepository {
  abstract findAll(
    page: number,
    limit: number,
    search: string | undefined,
    includeInactive: boolean,
  ): Promise<[Vaccine[], number]>
  abstract findById(id: string): Promise<Vaccine | null>
  abstract findByName(name: string): Promise<Vaccine | null>
  abstract create(data: CreateVaccineData, queryRunner?: QueryRunner): Promise<Vaccine>
  abstract update(id: string, data: UpdateVaccineData, queryRunner?: QueryRunner): Promise<Vaccine>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
