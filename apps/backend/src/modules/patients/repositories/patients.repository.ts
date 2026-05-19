import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ILike, QueryRunner, Repository } from 'typeorm'
import { Patient } from '../entities/patient.entity'
import { CreatePatientData, IPatientsRepository, UpdatePatientData } from './patients.repository.interface'

@Injectable()
export class PatientsRepository implements IPatientsRepository {
  constructor(
    @InjectRepository(Patient)
    private readonly repository: Repository<Patient>,
  ) {}

  async findAll(page: number, limit: number, search?: string): Promise<[Patient[], number]> {
    const where = search
      ? [
          { user: { fullName: ILike(`%${search}%`) } },
          { documentNumber: search },
        ]
      : {}

    return this.repository.findAndCount({
      relations: ['user'],
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    })
  }

  async findById(id: string): Promise<Patient | null> {
    return this.repository.findOne({ where: { id }, relations: ['user'] })
  }

  async findByDocumentNumber(documentNumber: string): Promise<Patient | null> {
    return this.repository.findOneBy({ documentNumber })
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
