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
    const qb = this.repository
      .createQueryBuilder('patient')
      .innerJoinAndSelect('patient.user', 'user')
      .where('user.clinicId = :clinicId', { clinicId })
      .orderBy('patient.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    if (search) {
      qb.andWhere(
        '(user.full_name ILIKE :search OR patient.document_number = :exactSearch)',
        { search: `%${search}%`, exactSearch: search },
      )
    }

    return qb.getManyAndCount()
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
    return this.repository
      .createQueryBuilder('patient')
      .innerJoin('patient.user', 'user')
      .where('patient.document_number = :documentNumber', { documentNumber })
      .andWhere('user.clinicId = :clinicId', { clinicId })
      .getOne()
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
