import { QueryRunner } from 'typeorm'
import { CreateDoctorDto, UpdateDoctorDto } from '@app/shared'
import { Doctor } from '../entities/doctor.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'

export abstract class IDoctorsRepository {
  abstract findAll(page: number, limit: number, search?: string): Promise<[Doctor[], number]>
  abstract findById(id: string): Promise<Doctor | null>
  abstract findByUserId(userId: string): Promise<Doctor | null>
  abstract findByCrmNumber(crmNumber: string): Promise<Doctor | null>
  abstract create(data: CreateDoctorDto, specialties: Specialty[], queryRunner?: QueryRunner): Promise<Doctor>
  abstract update(id: string, data: UpdateDoctorDto, specialties: Specialty[] | null, queryRunner?: QueryRunner): Promise<Doctor>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
