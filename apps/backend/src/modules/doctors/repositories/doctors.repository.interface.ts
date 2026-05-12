import { QueryRunner } from 'typeorm'
import { CreateDoctorDto, UpdateDoctorDto } from '@app/shared'
import { Doctor } from '../entities/doctor.entity'

export abstract class IDoctorsRepository {
  abstract findAll(page: number, limit: number, search?: string): Promise<[Doctor[], number]>
  abstract findById(id: string): Promise<Doctor | null>
  abstract findByUserId(userId: string): Promise<Doctor | null>
  abstract findByCrmNumber(crmNumber: string): Promise<Doctor | null>
  abstract create(data: CreateDoctorDto, queryRunner?: QueryRunner): Promise<Doctor>
  abstract update(id: string, data: UpdateDoctorDto, queryRunner?: QueryRunner): Promise<Doctor>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
