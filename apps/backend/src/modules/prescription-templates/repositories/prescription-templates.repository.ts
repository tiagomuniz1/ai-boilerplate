import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { PrescriptionTemplate } from '../entities/prescription-template.entity'
import {
  CreatePrescriptionTemplateData,
  IPrescriptionTemplatesRepository,
  UpdatePrescriptionTemplateData,
} from './prescription-templates.repository.interface'

@Injectable()
export class PrescriptionTemplatesRepository implements IPrescriptionTemplatesRepository {
  constructor(
    @InjectRepository(PrescriptionTemplate)
    private readonly repository: Repository<PrescriptionTemplate>,
  ) {}

  async findAll(clinicId: string, doctorId?: string): Promise<PrescriptionTemplate[]> {
    const where: Record<string, unknown> = { clinicId, isActive: true }
    if (doctorId) where.doctorId = doctorId
    return this.repository.find({
      where,
      order: { createdAt: 'DESC' },
    })
  }

  async findById(id: string, clinicId: string): Promise<PrescriptionTemplate | null> {
    return this.repository.findOne({ where: { id, clinicId } })
  }

  async create(data: CreatePrescriptionTemplateData, queryRunner?: QueryRunner): Promise<PrescriptionTemplate> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PrescriptionTemplate) : this.repository
    return repo.save(repo.create(data))
  }

  async update(id: string, data: UpdatePrescriptionTemplateData, queryRunner?: QueryRunner): Promise<PrescriptionTemplate> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PrescriptionTemplate) : this.repository
    await repo.update(id, data)
    return repo.findOneOrFail({ where: { id } })
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(PrescriptionTemplate) : this.repository
    await repo.softDelete(id)
  }
}
