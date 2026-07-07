import { QueryRunner } from 'typeorm'
import { UpdateDoctorDto } from '@app/shared'
import { Doctor } from '../entities/doctor.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'

export type DoctorCrmAssignment = { number: string; state: string; isPrimary: boolean }
export type DoctorSpecialtyAssignment = { specialty: Specialty; rqe: string | null }

export type CreateDoctorData = { userId: string; bio?: string | null }

export abstract class IDoctorsRepository {
  abstract findAll(page: number, limit: number, clinicId: string, search?: string): Promise<[Doctor[], number]>
  abstract findById(id: string, clinicId: string): Promise<Doctor | null>
  abstract findByUserId(userId: string, clinicId: string): Promise<Doctor | null>
  abstract findByCrm(number: string, state: string, clinicId: string): Promise<Doctor | null>
  abstract create(
    data: CreateDoctorData,
    clinicId: string,
    crms: DoctorCrmAssignment[],
    specialties: DoctorSpecialtyAssignment[],
    queryRunner?: QueryRunner,
  ): Promise<Doctor>
  abstract update(
    id: string,
    data: UpdateDoctorDto,
    crms: DoctorCrmAssignment[] | null,
    specialties: DoctorSpecialtyAssignment[] | null,
    queryRunner?: QueryRunner,
  ): Promise<Doctor>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
