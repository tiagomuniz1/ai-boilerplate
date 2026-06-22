import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicalRecordTemplateResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { MedicalRecordTemplate } from '../entities/medical-record-template.entity'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'

@Injectable()
export class FindMedicalRecordTemplateByIdUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindMedicalRecordTemplateByIdUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly templatesRepository: IMedicalRecordTemplatesRepository,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<MedicalRecordTemplateResponseDto> {
    const clinicId = currentUser.clinicId!
    const cacheKey = `medical_record_template:${clinicId}:${id}`

    try {
      const cached = await this.cacheService.get<MedicalRecordTemplateResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', {
        context: FindMedicalRecordTemplateByIdUseCase.name,
      })
    }

    const template = await this.templatesRepository.findById(id, clinicId)
    if (!template) throw new NotFoundException('Template not found')

    const specialty = await this.specialtiesRepository.findById(template.specialtyId)
    const response = this.toResponse(template, specialty?.name ?? '')

    try {
      await this.cacheService.set(cacheKey, response, 300)
    } catch {
      this.logger.warn('Cache write failed', {
        context: FindMedicalRecordTemplateByIdUseCase.name,
      })
    }

    return response
  }

  private toResponse(
    template: MedicalRecordTemplate,
    specialtyName: string,
  ): MedicalRecordTemplateResponseDto {
    return {
      id: template.id,
      specialtyId: template.specialtyId,
      specialtyName,
      name: template.name,
      fields: template.fields,
      sections: template.sections,
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    }
  }
}
