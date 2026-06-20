import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { MedicalRecordTemplate } from '../entities/medical-record-template.entity'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'

@Injectable()
export class FindTemplateByClinicAndSpecialtyUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly templatesRepository: IMedicalRecordTemplatesRepository,
  ) {
    super(dataSource)
  }

  async execute(clinicId: string, specialtyId: string): Promise<MedicalRecordTemplate | null> {
    return this.templatesRepository.findByClinicAndSpecialty(clinicId, specialtyId)
  }
}
