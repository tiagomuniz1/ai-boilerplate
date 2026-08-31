import {
  ConflictException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import {
  CanonicalFieldResponseDto,
  CreateCanonicalFieldDto,
  MedicalRecordFieldOptionDto,
  MedicalRecordFieldType,
} from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { MedicalRecordCanonicalField } from '../entities/medical-record-canonical-field.entity'
import { IMedicalRecordCanonicalFieldsRepository } from '../repositories/medical-record-canonical-fields.repository.interface'

@Injectable()
export class CreateCanonicalFieldUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateCanonicalFieldUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly canonicalFieldsRepository: IMedicalRecordCanonicalFieldsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateCanonicalFieldDto): Promise<CanonicalFieldResponseDto> {
    this.validateTypeOptions(dto.type, dto.options ?? null)

    const existing = await this.canonicalFieldsRepository.findByCanonicalKey(dto.canonicalKey)
    if (existing) throw new ConflictException('Canonical key already in use')

    const field = await this.canonicalFieldsRepository.create({
      canonicalKey: dto.canonicalKey,
      label: dto.label,
      type: dto.type,
      options: dto.options ?? null,
      unit: dto.unit ?? null,
      description: dto.description ?? null,
    })

    try {
      await this.cacheService.delByPattern('canonical_fields:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateCanonicalFieldUseCase.name })
    }

    return this.toResponse(field)
  }

  private validateTypeOptions(
    type: MedicalRecordFieldType,
    options: MedicalRecordFieldOptionDto[] | null,
  ): void {
    const requiresOptions =
      type === MedicalRecordFieldType.SELECT || type === MedicalRecordFieldType.MULTISELECT

    if (requiresOptions) {
      if (!options || options.length === 0) {
        throw new UnprocessableEntityException(
          'Options are required for select and multiselect fields',
        )
      }
      const values = options.map((option) => option.value)
      if (new Set(values).size !== values.length) {
        throw new UnprocessableEntityException('Option values must be unique')
      }
    } else if (options && options.length > 0) {
      throw new UnprocessableEntityException('Options are not allowed for this field type')
    }
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
