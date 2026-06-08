import { QueryRunner } from 'typeorm'
import { UpdateClinicDto } from '@app/shared'
import { Clinic } from '../entities/clinic.entity'

export abstract class IClinicsRepository {
  abstract findAll(page: number, limit: number, search?: string): Promise<[Clinic[], number]>
  abstract findById(id: string): Promise<Clinic | null>
  abstract findBySlug(slug: string): Promise<Clinic | null>
  abstract create(data: { name: string; slug: string }, queryRunner?: QueryRunner): Promise<Clinic>
  abstract update(id: string, data: UpdateClinicDto): Promise<Clinic>
}
