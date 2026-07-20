import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { MedicalRecord } from '../entities/medical-record.entity'
import {
  CreateMedicalRecordData,
  IMedicalRecordsRepository,
  UpdateMedicalRecordData,
} from './medical-records.repository.interface'

@Injectable()
export class MedicalRecordsRepository implements IMedicalRecordsRepository {
  constructor(
    @InjectRepository(MedicalRecord)
    private readonly repository: Repository<MedicalRecord>,
  ) {}

  private baseQuery() {
    return this.repository
      .createQueryBuilder('mr')
      .innerJoinAndSelect('mr.patient', 'patient')
      .innerJoinAndSelect('patient.user', 'patientUser')
      .innerJoinAndSelect('mr.professional', 'professional')
      .innerJoinAndSelect('professional.user', 'professionalUser')
      // LEFT JOIN: generalist records have specialty_id NULL — an inner join would drop them.
      .leftJoinAndSelect('mr.specialty', 'specialty')
  }

  async findById(id: string, clinicId: string): Promise<MedicalRecord | null> {
    return this.baseQuery()
      .where('mr.id = :id', { id })
      .andWhere('mr.clinicId = :clinicId', { clinicId })
      .getOne()
  }

  async findByAppointment(appointmentId: string, clinicId: string): Promise<MedicalRecord | null> {
    return this.baseQuery()
      .where('mr.appointmentId = :appointmentId', { appointmentId })
      .andWhere('mr.clinicId = :clinicId', { clinicId })
      .getOne()
  }

  async findByPatient(
    clinicId: string,
    patientId: string,
    page: number,
    limit: number,
    professionalId?: string,
  ): Promise<[MedicalRecord[], number]> {
    const qb = this.baseQuery()
      .where('mr.clinicId = :clinicId', { clinicId })
      .andWhere('mr.patientId = :patientId', { patientId })
      .orderBy('mr.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    if (professionalId) {
      qb.andWhere('mr.professionalId = :professionalId', { professionalId })
    }

    return qb.getManyAndCount()
  }

  async create(data: CreateMedicalRecordData, queryRunner?: QueryRunner): Promise<MedicalRecord> {
    const repo = queryRunner ? queryRunner.manager.getRepository(MedicalRecord) : this.repository
    const saved = await repo.save(repo.create(data))
    return this.findById(saved.id, data.clinicId) as Promise<MedicalRecord>
  }

  async update(id: string, data: UpdateMedicalRecordData, clinicId: string, queryRunner?: QueryRunner): Promise<MedicalRecord> {
    const repo = queryRunner ? queryRunner.manager.getRepository(MedicalRecord) : this.repository
    const patch: Partial<MedicalRecord> = {}
    if (data.data !== undefined) patch.data = data.data
    if (data.notes !== undefined) patch.notes = data.notes
    await repo.update(id, patch as any)
    return this.findById(id, clinicId) as Promise<MedicalRecord>
  }

  async delete(id: string, _clinicId: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(MedicalRecord) : this.repository
    await repo.softDelete(id)
  }
}
