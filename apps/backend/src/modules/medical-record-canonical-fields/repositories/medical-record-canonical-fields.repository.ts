import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { MedicalRecordCanonicalField } from '../entities/medical-record-canonical-field.entity'
import { IMedicalRecordCanonicalFieldsRepository } from './medical-record-canonical-fields.repository.interface'

@Injectable()
export class MedicalRecordCanonicalFieldsRepository
  implements IMedicalRecordCanonicalFieldsRepository
{
  constructor(
    @InjectRepository(MedicalRecordCanonicalField)
    private readonly repository: Repository<MedicalRecordCanonicalField>,
  ) {}

  async findForSuggestion(
    specialtyId: string | undefined,
    includeInactive: boolean,
  ): Promise<MedicalRecordCanonicalField[]> {
    const queryBuilder = this.repository.createQueryBuilder('field')

    if (!includeInactive) {
      queryBuilder.andWhere('field.isActive = :isActive', { isActive: true })
    }

    if (specialtyId) {
      queryBuilder.andWhere(
        '(field.specialtyId IS NULL OR field.specialtyId = :specialtyId)',
        { specialtyId },
      )
    } else {
      queryBuilder.andWhere('field.specialtyId IS NULL')
    }

    return queryBuilder
      .orderBy('field.specialtyId', 'ASC', 'NULLS FIRST')
      .addOrderBy('field.label', 'ASC')
      .getMany()
  }

  async findById(id: string): Promise<MedicalRecordCanonicalField | null> {
    return this.repository.findOneBy({ id })
  }

  async findByCanonicalKey(canonicalKey: string): Promise<MedicalRecordCanonicalField | null> {
    return this.repository.findOneBy({ canonicalKey })
  }

  async create(
    data: Partial<MedicalRecordCanonicalField>,
    queryRunner?: QueryRunner,
  ): Promise<MedicalRecordCanonicalField> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(MedicalRecordCanonicalField)
      : this.repository
    return repo.save(repo.create(data))
  }

  async update(
    id: string,
    data: Partial<MedicalRecordCanonicalField>,
    queryRunner?: QueryRunner,
  ): Promise<MedicalRecordCanonicalField> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(MedicalRecordCanonicalField)
      : this.repository
    const field = await repo.findOneByOrFail({ id })
    Object.assign(field, data)
    return repo.save(field)
  }
}
