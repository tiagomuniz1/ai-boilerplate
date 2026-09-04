import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { VaccineDecisionRecord } from '../entities/vaccine-decision.entity'
import {
  CreateDecisionData,
  IVaccineDecisionsRepository,
} from './vaccine-decisions.repository.interface'

@Injectable()
export class VaccineDecisionsRepository implements IVaccineDecisionsRepository {
  constructor(
    @InjectRepository(VaccineDecisionRecord)
    private readonly repository: Repository<VaccineDecisionRecord>,
  ) {}

  private base() {
    return this.repository
      .createQueryBuilder('decision')
      .innerJoinAndSelect('decision.vaccine', 'vaccine')
      .innerJoinAndSelect('decision.decidedByProfessional', 'professional')
      .innerJoinAndSelect('professional.user', 'professionalUser')
  }

  async findByPatient(patientId: string, clinicId: string): Promise<VaccineDecisionRecord[]> {
    return this.base()
      .where('decision.patientId = :patientId', { patientId })
      .andWhere('decision.clinicId = :clinicId', { clinicId })
      .getMany()
  }

  async findByPatientAndVaccine(
    patientId: string,
    vaccineId: string,
    clinicId: string,
  ): Promise<VaccineDecisionRecord | null> {
    return this.base()
      .where('decision.patientId = :patientId', { patientId })
      .andWhere('decision.vaccineId = :vaccineId', { vaccineId })
      .andWhere('decision.clinicId = :clinicId', { clinicId })
      .getOne()
  }

  async create(data: CreateDecisionData, queryRunner?: QueryRunner): Promise<VaccineDecisionRecord> {
    const repo = queryRunner ? queryRunner.manager.getRepository(VaccineDecisionRecord) : this.repository
    const saved = await repo.save(repo.create(data))
    return this.findByPatientAndVaccine(
      data.patientId,
      data.vaccineId,
      data.clinicId,
    ) as Promise<VaccineDecisionRecord>
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(VaccineDecisionRecord) : this.repository
    await repo.softDelete(id)
  }
}
