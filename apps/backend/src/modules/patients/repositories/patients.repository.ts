import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { Patient } from '../entities/patient.entity'
import { CreatePatientData, IPatientsRepository, UpdatePatientData } from './patients.repository.interface'

@Injectable()
export class PatientsRepository implements IPatientsRepository {
  constructor(
    @InjectRepository(Patient)
    private readonly repository: Repository<Patient>,
  ) {}

  async findAll(page: number, limit: number, clinicId: string, search?: string): Promise<[Patient[], number]> {
    if (search) {
      const isDocumentSearch = /^\d+$/.test(search.trim())

      if (isDocumentSearch) {
        // CPF / document number: exact match via patients_document_number_clinic_active_unique.
        const qb = this.repository
          .createQueryBuilder('patient')
          .innerJoinAndSelect('patient.user', 'user')
          .where('patient.clinic_id = :clinicId', { clinicId })
          .andWhere('patient.document_number = :doc', { doc: search.trim() })
          .orderBy('patient.createdAt', 'DESC')
          .skip((page - 1) * limit)
          .take(limit)
        return qb.getManyAndCount()
      }

      // Name search: subquery lets PostgreSQL use IDX_users_full_name_trgm (trigram GIN index)
      // to find matching user_ids first, then IDX_patients_user_id to reach the patients.
      // Raw SQL must use a schema-qualified table name because TypeORM does not prefix
      // unmanaged references in raw WHERE fragments — without this, the query fails when
      // search_path does not include the tenant schema.
      const schema = (this.repository.manager.connection.options as any).schema as string | undefined
      const usersRef = schema ? `"${schema}"."users"` : 'users'
      const userSubSql = `patient.user_id IN (SELECT u.id FROM ${usersRef} u WHERE u.clinic_id = :clinicId AND u.full_name ILIKE :search AND u.deleted_at IS NULL)`

      const [ids, total] = await Promise.all([
        this.repository
          .createQueryBuilder('patient')
          .select('patient.id')
          .where(userSubSql, { clinicId, search: `%${search.trim()}%` })
          .orderBy('patient.createdAt', 'DESC')
          .skip((page - 1) * limit)
          .take(limit)
          .getMany()
          .then((rows) => rows.map((p) => p.id)),
        this.repository
          .createQueryBuilder('patient')
          .where(userSubSql, { clinicId, search: `%${search.trim()}%` })
          .getCount(),
      ])

      if (ids.length === 0) return [[], total]

      const patients = await this.repository
        .createQueryBuilder('patient')
        .innerJoinAndSelect('patient.user', 'user')
        .where('patient.id IN (:...ids)', { ids })
        .orderBy('patient.createdAt', 'DESC')
        .getMany()

      return [patients, total]
    }

    // Split query: paginate IDs using IDX_patients_clinic_created_at (no join, instant),
    // then load the 20 full entities with their user relation.
    const [ids, total] = await Promise.all([
      this.repository
        .createQueryBuilder('patient')
        .select('patient.id')
        .where('patient.clinic_id = :clinicId', { clinicId })
        .orderBy('patient.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany()
        .then((rows) => rows.map((p) => p.id)),
      this.repository
        .createQueryBuilder('patient')
        .where('patient.clinic_id = :clinicId', { clinicId })
        .getCount(),
    ])

    if (ids.length === 0) return [[], total]

    const patients = await this.repository
      .createQueryBuilder('patient')
      .innerJoinAndSelect('patient.user', 'user')
      .where('patient.id IN (:...ids)', { ids })
      .orderBy('patient.createdAt', 'DESC')
      .getMany()

    return [patients, total]
  }

  async findById(id: string, clinicId: string): Promise<Patient | null> {
    return this.repository
      .createQueryBuilder('patient')
      .innerJoinAndSelect('patient.user', 'user')
      .where('patient.id = :id', { id })
      .andWhere('user.clinicId = :clinicId', { clinicId })
      .getOne()
  }

  async findByUserId(userId: string): Promise<Patient | null> {
    return this.repository.findOneBy({ userId })
  }

  async findByDocumentNumber(documentNumber: string, clinicId: string): Promise<Patient | null> {
    return this.repository.findOneBy({ documentNumber, clinicId })
  }

  async create(data: CreatePatientData, queryRunner?: QueryRunner): Promise<Patient> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Patient) : this.repository
    const saved = await repo.save(repo.create(data))
    return repo.findOneOrFail({ where: { id: saved.id }, relations: ['user'] })
  }

  async update(id: string, data: UpdatePatientData, queryRunner?: QueryRunner): Promise<Patient> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Patient) : this.repository
    const patient = await repo.findOneOrFail({ where: { id }, relations: ['user'] })
    Object.assign(patient, data)
    return repo.save(patient)
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Patient) : this.repository
    await repo.softDelete(id)
  }
}
