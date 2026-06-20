import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import {
  CanonicalFieldResponseDto,
  MedicalRecordFieldOptionDto,
  MedicalRecordFieldType,
  UpdateCanonicalFieldDto,
} from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { MedicalRecordCanonicalField } from '../entities/medical-record-canonical-field.entity'
import { IMedicalRecordCanonicalFieldsRepository } from '../repositories/medical-record-canonical-fields.repository.interface'

@Injectable()
export class UpdateCanonicalFieldUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateCanonicalFieldUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly canonicalFieldsRepository: IMedicalRecordCanonicalFieldsRepository,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, dto: UpdateCanonicalFieldDto): Promise<CanonicalFieldResponseDto> {
    const field = await this.canonicalFieldsRepository.findById(id)
    if (!field) throw new NotFoundException('Canonical field not found')

    if (dto.type !== undefined || dto.options !== undefined) {
      const effectiveType = dto.type ?? field.type
      const effectiveOptions = dto.options !== undefined ? dto.options : field.options
      this.validateTypeOptions(effectiveType, effectiveOptions ?? null)
    }

    if (dto.specialtyId) {
      const specialty = await this.specialtiesRepository.findById(dto.specialtyId)
      if (!specialty) throw new UnprocessableEntityException('Specialty not found')
    }

    if (dto.canonicalKey !== undefined && dto.canonicalKey !== field.canonicalKey) {
      const existing = await this.canonicalFieldsRepository.findByCanonicalKey(dto.canonicalKey)
      if (existing) throw new ConflictException('Canonical key already in use')
    }

    const updateData: Partial<MedicalRecordCanonicalField> = {}
    if (dto.canonicalKey !== undefined) updateData.canonicalKey = dto.canonicalKey
    if (dto.label !== undefined) updateData.label = dto.label
    if (dto.type !== undefined) updateData.type = dto.type
    if (dto.options !== undefined) {
      updateData.options = dto.options.length > 0 ? dto.options : null
    }
    if (dto.unit !== undefined) updateData.unit = dto.unit ?? null
    if (dto.specialtyId !== undefined) updateData.specialtyId = dto.specialtyId ?? null
    if (dto.description !== undefined) updateData.description = dto.description ?? null
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive

    const updated = await this.canonicalFieldsRepository.update(id, updateData)

    try {
      await this.cacheService.delByPattern('canonical_fields:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdateCanonicalFieldUseCase.name })
    }

    return this.toResponse(updated)
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
      specialtyId: field.specialtyId,
      description: field.description,
      isActive: field.isActive,
    }
  }
}
