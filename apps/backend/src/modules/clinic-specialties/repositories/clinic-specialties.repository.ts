import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ILike, QueryRunner, Repository } from 'typeorm'
import { ClinicSpecialty } from '../entities/clinic-specialty.entity'
import { IClinicSpecialtiesRepository } from './clinic-specialties.repository.interface'

@Injectable()
export class ClinicSpecialtiesRepository implements IClinicSpecialtiesRepository {
  constructor(
    @InjectRepository(ClinicSpecialty)
    private readonly repository: Repository<ClinicSpecialty>,
  ) {}

  async findByClinicId(
    clinicId: string,
    page: number,
    limit: number,
    search?: string,
  ): Promise<[ClinicSpecialty[], number]> {
    const qb = this.repository
      .createQueryBuilder('cs')
      .innerJoinAndSelect('cs.specialty', 'specialty')
      .where('cs.clinicId = :clinicId', { clinicId })

    if (search) {
      qb.andWhere('specialty.name ILIKE :search', { search: `%${search}%` })
    }

    return qb
      .orderBy('specialty.name', 'ASC')
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount()
  }

  async findByClinicAndSpecialty(
    clinicId: string,
    specialtyId: string,
  ): Promise<ClinicSpecialty | null> {
    return this.repository.findOneBy({ clinicId, specialtyId })
  }

  async link(
    clinicId: string,
    specialtyId: string,
    queryRunner?: QueryRunner,
  ): Promise<ClinicSpecialty> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(ClinicSpecialty)
      : this.repository
    const record = repo.create({ clinicId, specialtyId })
    return repo.save(record)
  }

  async unlink(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(ClinicSpecialty)
      : this.repository
    await repo.delete(id)
  }
}
