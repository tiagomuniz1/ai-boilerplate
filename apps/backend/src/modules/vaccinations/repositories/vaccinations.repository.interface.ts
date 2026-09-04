import { QueryRunner } from 'typeorm'
import { Vaccination } from '../entities/vaccination.entity'

export interface CreateVaccinationData {
  clinicId: string
  patientId: string
  vaccineId: string
  appointmentId: string | null
  recordedByProfessionalId: string
  doseLabel: string
  appliedAt: string
  appliedAtOurClinic: boolean
  appliedAtDescription: string | null
  lotNumber: string | null
  manufacturer: string | null
  notes: string | null
}

export interface UpdateVaccinationData {
  doseLabel?: string
  appliedAt?: string
  appliedAtOurClinic?: boolean
  appliedAtDescription?: string | null
  lotNumber?: string | null
  manufacturer?: string | null
  notes?: string | null
}

export abstract class IVaccinationsRepository {
  abstract findByPatient(
    patientId: string,
    clinicId: string,
    page: number,
    limit: number,
  ): Promise<[Vaccination[], number]>
  abstract findByAppointment(appointmentId: string, clinicId: string): Promise<Vaccination[]>
  abstract findById(id: string, clinicId: string): Promise<Vaccination | null>
  abstract create(data: CreateVaccinationData, queryRunner?: QueryRunner): Promise<Vaccination>
  abstract update(id: string, data: UpdateVaccinationData, queryRunner?: QueryRunner): Promise<Vaccination>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
