import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { Medication } from '../entities/medication.entity'
import {
  CreateMedicationData,
  IMedicationsRepository,
  UpdateMedicationData,
} from './medications.repository.interface'

const BULK_UPSERT_OVERWRITE_COLUMNS = [
  'name',
  'active_ingredient',
  'regulatory_category',
  'therapeutic_class',
  'holder_company',
  'registration_number',
  'registration_status',
  'source',
  'is_active',
  'updated_at',
]

@Injectable()
export class MedicationsRepository implements IMedicationsRepository {
  constructor(
    @InjectRepository(Medication)
    private readonly repository: Repository<Medication>,
  ) {}

  async findAll(
    page: number,
    limit: number,
    search: string | undefined,
    includeInactive: boolean,
  ): Promise<[Medication[], number]> {
    const qb = this.repository.createQueryBuilder('medication')

    if (!includeInactive) {
      qb.andWhere('medication.is_active = :isActive', { isActive: true })
    }

    const term = search?.trim()
    if (term) {
      qb.andWhere(
        '(medication.name ILIKE :term OR medication.active_ingredient ILIKE :term)',
        { term: `%${term}%` },
      )
    }

    return qb
      .orderBy('medication.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()
  }

  async findById(id: string): Promise<Medication | null> {
    return this.repository.findOneBy({ id })
  }

  async create(data: CreateMedicationData, queryRunner?: QueryRunner): Promise<Medication> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Medication) : this.repository
    return repo.save(repo.create(data))
  }

  async update(id: string, data: UpdateMedicationData, queryRunner?: QueryRunner): Promise<Medication> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Medication) : this.repository
    const medication = await repo.findOneByOrFail({ id })
    Object.assign(medication, data)
    return repo.save(medication)
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Medication) : this.repository
    await repo.softDelete(id)
  }

  async bulkUpsert(rows: CreateMedicationData[], queryRunner?: QueryRunner): Promise<void> {
    if (rows.length === 0) return

    const repo = queryRunner ? queryRunner.manager.getRepository(Medication) : this.repository
    await repo
      .createQueryBuilder()
      .insert()
      .into(Medication)
      .values(rows)
      .orUpdate(BULK_UPSERT_OVERWRITE_COLUMNS, ['import_hash'], {
        indexPredicate: 'import_hash IS NOT NULL',
      })
      .execute()

  }
}
