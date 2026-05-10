import { QueryRunner } from 'typeorm'
import { CreatePatientDto, UpdatePatientDto } from '@app/shared'
import { Patient } from '../entities/patient.entity'

export abstract class IPatientsRepository {
  abstract findAll(page: number, limit: number, search?: string): Promise<[Patient[], number]>
  abstract findById(id: string): Promise<Patient | null>
  abstract findByDocumentNumber(documentNumber: string): Promise<Patient | null>
  abstract create(data: CreatePatientDto, queryRunner?: QueryRunner): Promise<Patient>
  abstract update(id: string, data: UpdatePatientDto, queryRunner?: QueryRunner): Promise<Patient>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
