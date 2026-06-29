import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ILike, In, QueryRunner, Repository } from 'typeorm'
import { CreateSpecialtyDto, UpdateSpecialtyDto } from '@app/shared'
import { Doctor } from '../../doctors/entities/doctor.entity'
import { Specialty } from '../entities/specialty.entity'
import { ISpecialtiesRepository } from './specialties.repository.interface'

@Injectable()
export class SpecialtiesRepository implements ISpecialtiesRepository {
  constructor(
    @InjectRepository(Specialty)
    private readonly repository: Repository<Specialty>,
  ) {}

  async findAll(page: number, limit: number, search?: string): Promise<[Specialty[], number]> {
    const where = search ? { name: ILike(`%${search}%`) } : {}
    return this.repository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    })
  }

  async findById(id: string): Promise<Specialty | null> {
    return this.repository.findOneBy({ id })
  }

  async findByIds(ids: string[]): Promise<Specialty[]> {
    if (ids.length === 0) return []
    return this.repository.findBy({ id: In(ids) })
  }

  async findByName(name: string): Promise<Specialty | null> {
    return this.repository.findOneBy({ name: ILike(name) })
  }

  async create(data: CreateSpecialtyDto, queryRunner?: QueryRunner): Promise<Specialty> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(Specialty)
      : this.repository
    return repo.save(repo.create(data))
  }

  async update(id: string, data: UpdateSpecialtyDto, queryRunner?: QueryRunner): Promise<Specialty> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(Specialty)
      : this.repository
    const specialty = await repo.findOneByOrFail({ id })
    Object.assign(specialty, data)
    return repo.save(specialty)
  }

  async countLinkedDoctors(id: string): Promise<number> {
    return this.repository.manager
      .createQueryBuilder(Doctor, 'doctor')
      .innerJoin('doctor.specialties', 'specialty')
      .where('specialty.id = :id', { id })
      .getCount()
  }

  async countLinkedClinics(id: string): Promise<number> {
    return this.repository.manager
      .createQueryBuilder()
      .select()
      .from('clinic_specialties', 'cs')
      .where('cs.specialty_id = :id', { id })
      .getCount()
  }

  async countLinkedClinicsForAll(ids: string[]): Promise<Record<string, number>> {
    if (ids.length === 0) return {}

    const rows: Array<{ specialty_id: string; count: string }> = await this.repository.manager
      .createQueryBuilder()
      .select('cs.specialty_id', 'specialty_id')
      .addSelect('COUNT(*)', 'count')
      .from('clinic_specialties', 'cs')
      .where('cs.specialty_id IN (:...ids)', { ids })
      .groupBy('cs.specialty_id')
      .getRawMany()

    const result: Record<string, number> = {}
    for (const row of rows) {
      result[row.specialty_id] = parseInt(row.count, 10)
    }
    return result
  }

  async countLinkedAppointments(id: string): Promise<number> {
    return this.repository.manager
      .createQueryBuilder()
      .select()
      .from('appointments', 'appointment')
      .where('appointment.specialty_id = :id', { id })
      .getCount()
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(Specialty)
      : this.repository
    await repo.softDelete(id)
  }
}
