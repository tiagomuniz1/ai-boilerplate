import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import {
  MedicalRecordTemplateResponseDto,
  PaginatedMedicalRecordTemplatesResponseDto,
} from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { MedicalRecordTemplate } from '../entities/medical-record-template.entity'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'
import { MedicalRecordTemplateListQueryDto } from '../dto/medical-record-template-list-query.dto'

@Injectable()
export class FindAllMedicalRecordTemplatesUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindAllMedicalRecordTemplatesUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly templatesRepository: IMedicalRecordTemplatesRepository,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    query: MedicalRecordTemplateListQueryDto,
    currentUser: ICurrentUser,
  ): Promise<PaginatedMedicalRecordTemplatesResponseDto> {
    const clinicId = currentUser.clinicId!
    const { page = 1, limit = 20, specialtyId, generalist, councilType } = query
    const filterKey = councilType ?? (generalist ? 'generalist' : specialtyId ?? 'all')
    const cacheKey = `medical_record_templates:list:${clinicId}:${page}:${limit}:${filterKey}`

    try {
      const cached =
        await this.cacheService.get<PaginatedMedicalRecordTemplatesResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', {
        context: FindAllMedicalRecordTemplatesUseCase.name,
      })
    }

    const [templates, total] = await this.templatesRepository.findAll(
      clinicId,
      page,
      limit,
      specialtyId,
      generalist,
      councilType,
    )

    const specialtyIds = [
      ...new Set(
        templates
          .map((template) => template.specialtyId)
          .filter((id): id is string => id !== null),
      ),
    ]
    const specialties = await this.specialtiesRepository.findByIds(specialtyIds)
    const nameMap = new Map(specialties.map((specialty) => [specialty.id, specialty.name]))

    const result: PaginatedMedicalRecordTemplatesResponseDto = {
      data: templates.map((template) =>
        this.toResponse(
          template,
          template.specialtyId ? nameMap.get(template.specialtyId) ?? null : null,
        ),
      ),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', {
        context: FindAllMedicalRecordTemplatesUseCase.name,
      })
    }

    return result
  }

  private toResponse(
    template: MedicalRecordTemplate,
    specialtyName: string | null,
  ): MedicalRecordTemplateResponseDto {
    return {
      id: template.id,
      specialtyId: template.specialtyId,
      specialtyName,
      councilType: template.councilType,
      name: template.name,
      fields: template.fields,
      sections: template.sections,
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    }
  }
}
