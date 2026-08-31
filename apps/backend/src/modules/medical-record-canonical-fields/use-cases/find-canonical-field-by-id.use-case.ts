import { Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CanonicalFieldResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { MedicalRecordCanonicalField } from '../entities/medical-record-canonical-field.entity'
import { IMedicalRecordCanonicalFieldsRepository } from '../repositories/medical-record-canonical-fields.repository.interface'

@Injectable()
export class FindCanonicalFieldByIdUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly canonicalFieldsRepository: IMedicalRecordCanonicalFieldsRepository,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<CanonicalFieldResponseDto> {
    const field = await this.canonicalFieldsRepository.findById(id)
    if (!field) throw new NotFoundException('Canonical field not found')

    return this.toResponse(field)
  }

  private toResponse(field: MedicalRecordCanonicalField): CanonicalFieldResponseDto {
    return {
      id: field.id,
      canonicalKey: field.canonicalKey,
      label: field.label,
      type: field.type,
      options: field.options,
      unit: field.unit,
      description: field.description,
      isActive: field.isActive,
    }
  }
}
