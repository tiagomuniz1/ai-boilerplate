import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { VaccineIndication } from '../entities/vaccine-indication.entity'
import {
  CreateVaccineIndicationData,
  IVaccineIndicationsRepository,
} from './vaccine-indications.repository.interface'

@Injectable()
export class VaccineIndicationsRepository implements IVaccineIndicationsRepository {
  constructor(
    @InjectRepository(VaccineIndication)
    private readonly repository: Repository<VaccineIndication>,
  ) {}

  async findByAppointment(appointmentId: string, clinicId: string): Promise<VaccineIndication[]> {
    return this.repository.find({
      where: { appointmentId, clinicId },
      order: { issuedAt: 'DESC' },
    })
  }

  async findById(id: string, clinicId: string): Promise<VaccineIndication | null> {
    return this.repository.findOneBy({ id, clinicId })
  }

  async create(data: CreateVaccineIndicationData, queryRunner?: QueryRunner): Promise<VaccineIndication> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(VaccineIndication)
      : this.repository
    return repository.save(repository.create(data))
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(VaccineIndication)
      : this.repository
    await repository.softDelete(id)
  }
}
