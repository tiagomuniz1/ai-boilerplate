import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { CreatePatientDto, UpdatePatientDto } from '@app/shared'
import { Patient } from '../entities/patient.entity'
import { IPatientsRepository } from './patients.repository.interface'

@Injectable()
export class PatientsRepository implements IPatientsRepository {
  constructor(
    @InjectRepository(Patient)
    private readonly repository: Repository<Patient>,
  ) {}

  async findAll(page: number, limit: number, search?: string): Promise<[Patient[], number]> {
    const query = this.repository
      .createQueryBuilder('patient')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('patient.created_at', 'DESC')

    if (search) {
      query.andWhere(
        '(patient.full_name ILIKE :search OR patient.document_number = :exact)',
        { search: `%${search}%`, exact: search },
      )
    }

    return query.getManyAndCount()
  }

  async findById(id: string): Promise<Patient | null> {
    return this.repository.findOneBy({ id })
  }

  async findByDocumentNumber(documentNumber: string): Promise<Patient | null> {
    return this.repository.findOneBy({ documentNumber })
  }

  async create(data: CreatePatientDto, queryRunner?: QueryRunner): Promise<Patient> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Patient) : this.repository
    return repo.save(repo.create(data))
  }

  async update(id: string, data: UpdatePatientDto, queryRunner?: QueryRunner): Promise<Patient> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Patient) : this.repository
    const patient = await repo.findOneByOrFail({ id })
    Object.assign(patient, data)
    return repo.save(patient)
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Patient) : this.repository
    await repo.softDelete(id)
  }
}
