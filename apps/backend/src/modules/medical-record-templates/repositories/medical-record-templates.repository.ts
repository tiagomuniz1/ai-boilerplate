import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { MedicalRecordTemplate } from '../entities/medical-record-template.entity'
import { IMedicalRecordTemplatesRepository } from './medical-record-templates.repository.interface'

@Injectable()
export class MedicalRecordTemplatesRepository implements IMedicalRecordTemplatesRepository {
  constructor(
    @InjectRepository(MedicalRecordTemplate)
    private readonly repository: Repository<MedicalRecordTemplate>,
  ) {}

  async findAll(
    clinicId: string,
    page: number,
    limit: number,
    specialtyId?: string,
  ): Promise<[MedicalRecordTemplate[], number]> {
    const queryBuilder = this.repository
      .createQueryBuilder('template')
      .where('template.clinicId = :clinicId', { clinicId })

    if (specialtyId) {
      queryBuilder.andWhere('template.specialtyId = :specialtyId', { specialtyId })
    }

    return queryBuilder
      .orderBy('template.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()
  }

  async findById(id: string, clinicId: string): Promise<MedicalRecordTemplate | null> {
    return this.repository.findOneBy({ id, clinicId })
  }

  async findByClinicAndSpecialty(
    clinicId: string,
    specialtyId: string,
  ): Promise<MedicalRecordTemplate | null> {
    return this.repository.findOneBy({ clinicId, specialtyId })
  }

  async create(
    data: Partial<MedicalRecordTemplate>,
    clinicId: string,
    queryRunner?: QueryRunner,
  ): Promise<MedicalRecordTemplate> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(MedicalRecordTemplate)
      : this.repository
    return repo.save(repo.create({ ...data, clinicId }))
  }

  async update(
    id: string,
    data: Partial<MedicalRecordTemplate>,
    clinicId: string,
    queryRunner?: QueryRunner,
  ): Promise<MedicalRecordTemplate> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(MedicalRecordTemplate)
      : this.repository
    const template = await repo.findOneByOrFail({ id, clinicId })
    Object.assign(template, data)
    return repo.save(template)
  }

  async delete(id: string, clinicId: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(MedicalRecordTemplate)
      : this.repository
    await repo.softDelete({ id, clinicId })
  }
}
