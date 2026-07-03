import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { MedicalCertificate } from '../entities/medical-certificate.entity'
import { CreateMedicalCertificateData, IMedicalCertificatesRepository } from './medical-certificates.repository.interface'

@Injectable()
export class MedicalCertificatesRepository implements IMedicalCertificatesRepository {
  constructor(
    @InjectRepository(MedicalCertificate)
    private readonly repository: Repository<MedicalCertificate>,
  ) {}

  async findByAppointment(appointmentId: string, clinicId: string): Promise<MedicalCertificate[]> {
    return this.repository.find({
      where: { appointmentId, clinicId },
      order: { issuedAt: 'DESC' },
    })
  }

  async findById(id: string, clinicId: string): Promise<MedicalCertificate | null> {
    return this.repository.findOne({ where: { id, clinicId } })
  }

  async create(data: CreateMedicalCertificateData, queryRunner?: QueryRunner): Promise<MedicalCertificate> {
    const repo = queryRunner ? queryRunner.manager.getRepository(MedicalCertificate) : this.repository
    return repo.save(repo.create(data))
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(MedicalCertificate) : this.repository
    await repo.softDelete(id)
  }
}
