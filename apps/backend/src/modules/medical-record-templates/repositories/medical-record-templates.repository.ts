import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, QueryRunner, Repository } from 'typeorm'
import { CouncilType } from '@app/shared'
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
    generalist?: boolean,
    councilType?: CouncilType,
  ): Promise<[MedicalRecordTemplate[], number]> {
    const queryBuilder = this.repository
      .createQueryBuilder('template')
      .where('template.clinicId = :clinicId', { clinicId })

    if (generalist || councilType) {
      queryBuilder.andWhere('template.specialtyId IS NULL')
      if (councilType) {
        queryBuilder.andWhere('template.councilType = :councilType', { councilType })
      }
    } else if (specialtyId) {
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
    specialtyId: string | null,
    councilType?: CouncilType | null,
  ): Promise<MedicalRecordTemplate | null> {
    // A raw null generates `specialty_id = NULL` which never matches — use IsNull(). When
    // specialtyId is null, councilType disambiguates which profession's generalist template
    // this is (every such row always has one — see the backfill in the migration that added it).
    return this.repository.findOneBy(
      specialtyId
        ? { clinicId, specialtyId }
        : { clinicId, specialtyId: IsNull(), councilType: councilType ?? IsNull() },
    )
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
