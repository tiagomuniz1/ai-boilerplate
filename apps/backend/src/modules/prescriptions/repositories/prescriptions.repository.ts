import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { Prescription } from '../entities/prescription.entity'
import { CreatePrescriptionData, IPrescriptionsRepository } from './prescriptions.repository.interface'

@Injectable()
export class PrescriptionsRepository implements IPrescriptionsRepository {
  constructor(
    @InjectRepository(Prescription)
    private readonly repository: Repository<Prescription>,
  ) {}

  async findByAppointment(appointmentId: string, clinicId: string): Promise<Prescription[]> {
    return this.repository.find({
      where: { appointmentId, clinicId },
      order: { issuedAt: 'DESC' },
    })
  }

  async findById(id: string, clinicId: string): Promise<Prescription | null> {
    return this.repository.findOne({ where: { id, clinicId } })
  }

  async findByVerificationToken(token: string): Promise<Prescription | null> {
    return this.repository.findOne({ where: { verificationToken: token } })
  }

  async create(data: CreatePrescriptionData, queryRunner?: QueryRunner): Promise<Prescription> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Prescription) : this.repository
    return repo.save(repo.create(data))
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Prescription) : this.repository
    await repo.softDelete(id)
  }
}
