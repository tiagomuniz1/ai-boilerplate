import { QueryRunner } from 'typeorm'
import { CreateSpecialtyDto, UpdateSpecialtyDto } from '@app/shared'
import { Specialty } from '../entities/specialty.entity'

export abstract class ISpecialtiesRepository {
  abstract findAll(page: number, limit: number, search?: string): Promise<[Specialty[], number]>
  abstract findById(id: string): Promise<Specialty | null>
  abstract findByIds(ids: string[]): Promise<Specialty[]>
  abstract findByName(name: string): Promise<Specialty | null>
  abstract countLinkedDoctors(id: string): Promise<number>
  abstract countLinkedClinics(id: string): Promise<number>
  abstract countLinkedClinicsForAll(ids: string[]): Promise<Record<string, number>>
  abstract countLinkedAppointments(id: string): Promise<number>
  abstract create(data: CreateSpecialtyDto, queryRunner?: QueryRunner): Promise<Specialty>
  abstract update(id: string, data: UpdateSpecialtyDto, queryRunner?: QueryRunner): Promise<Specialty>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
