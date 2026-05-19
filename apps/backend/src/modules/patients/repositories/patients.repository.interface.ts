import { QueryRunner } from 'typeorm'
import { PatientGender } from '@app/shared'
import { Patient } from '../entities/patient.entity'

export interface CreatePatientData {
  userId: string
  documentNumber: string
  phoneNumber: string
  birthDate: string
  gender: PatientGender
}

export interface UpdatePatientData {
  phoneNumber?: string
  birthDate?: string
  gender?: PatientGender
}

export abstract class IPatientsRepository {
  abstract findAll(page: number, limit: number, search?: string): Promise<[Patient[], number]>
  abstract findById(id: string): Promise<Patient | null>
  abstract findByDocumentNumber(documentNumber: string): Promise<Patient | null>
  abstract create(data: CreatePatientData, queryRunner?: QueryRunner): Promise<Patient>
  abstract update(id: string, data: UpdatePatientData, queryRunner?: QueryRunner): Promise<Patient>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
