import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CanonicalFieldResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CanonicalFieldListQueryDto } from '../dto/canonical-field-list-query.dto'
import { MedicalRecordCanonicalField } from '../entities/medical-record-canonical-field.entity'
import { IMedicalRecordCanonicalFieldsRepository } from '../repositories/medical-record-canonical-fields.repository.interface'

@Injectable()
export class FindCanonicalFieldsUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindCanonicalFieldsUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly canonicalFieldsRepository: IMedicalRecordCanonicalFieldsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    query: CanonicalFieldListQueryDto,
    currentUser: ICurrentUser,
  ): Promise<CanonicalFieldResponseDto[]> {
    const includeInactive =
      query.includeInactive === true && currentUser.role === UserRole.PLATFORM_ADMIN
    const cacheKey = `canonical_fields:list:${query.specialtyId ?? 'all'}`

    if (!includeInactive) {
      try {
        const cached = await this.cacheService.get<CanonicalFieldResponseDto[]>(cacheKey)
        if (cached) return cached
      } catch {
        this.logger.warn('Cache read failed', { context: FindCanonicalFieldsUseCase.name })
      }
    }

    const fields = await this.canonicalFieldsRepository.findForSuggestion(
      query.specialtyId,
      includeInactive,
    )
    const result = fields.map((field) => this.toResponse(field))

    if (!includeInactive) {
      try {
        await this.cacheService.set(cacheKey, result, 600)
      } catch {
        this.logger.warn('Cache write failed', { context: FindCanonicalFieldsUseCase.name })
      }
    }

    return result
  }

  private toResponse(field: MedicalRecordCanonicalField): CanonicalFieldResponseDto {
    return {
      id: field.id,
      canonicalKey: field.canonicalKey,
      label: field.label,
      type: field.type,
      options: field.options,
      unit: field.unit,
      specialtyId: field.specialtyId,
      description: field.description,
      isActive: field.isActive,
    }
  }
}
