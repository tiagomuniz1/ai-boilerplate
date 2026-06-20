import {
  ConflictException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import {
  CreateMedicalRecordTemplateDto,
  MedicalRecordFieldType,
  MedicalRecordTemplateFieldDto,
  MedicalRecordTemplateResponseDto,
} from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IClinicSpecialtiesRepository } from '../../clinic-specialties/repositories/clinic-specialties.repository.interface'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IMedicalRecordCanonicalFieldsRepository } from '../../medical-record-canonical-fields/repositories/medical-record-canonical-fields.repository.interface'
import {
  MedicalRecordTemplate,
  MedicalRecordTemplateField,
} from '../entities/medical-record-template.entity'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'
import { generateFieldKey } from '../utils/generate-field-key.util'

@Injectable()
export class CreateMedicalRecordTemplateUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateMedicalRecordTemplateUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly templatesRepository: IMedicalRecordTemplatesRepository,
    private readonly clinicSpecialtiesRepository: IClinicSpecialtiesRepository,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly canonicalFieldsRepository: IMedicalRecordCanonicalFieldsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    dto: CreateMedicalRecordTemplateDto,
    currentUser: ICurrentUser,
  ): Promise<MedicalRecordTemplateResponseDto> {
    const clinicId = currentUser.clinicId!

    const link = await this.clinicSpecialtiesRepository.findByClinicAndSpecialty(
      clinicId,
      dto.specialtyId,
    )
    if (!link) throw new UnprocessableEntityException('Specialty is not linked to this clinic')

    const existing = await this.templatesRepository.findByClinicAndSpecialty(
      clinicId,
      dto.specialtyId,
    )
    if (existing) throw new ConflictException('A template already exists for this specialty')

    const fields = await this.resolveFields(dto.fields)

    const created = await this.templatesRepository.create(
      { specialtyId: dto.specialtyId, name: dto.name, fields },
      clinicId,
    )

    try {
      await this.cacheService.delByPattern(`medical_record_templates:list:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', {
        context: CreateMedicalRecordTemplateUseCase.name,
      })
    }

    const specialty = await this.specialtiesRepository.findById(dto.specialtyId)
    return this.toResponse(created, specialty?.name ?? '')
  }

  private async resolveFields(
    inputFields: MedicalRecordTemplateFieldDto[],
  ): Promise<MedicalRecordTemplateField[]> {
    const usedKeys = new Set<string>()
    const resolved: MedicalRecordTemplateField[] = []

    for (const field of inputFields) {
      this.validateFieldOptions(field)
      await this.validateCanonical(field)

      // The client never sets the key on create — it is always generated.
      const key = generateFieldKey(field.label, usedKeys)

      resolved.push({
        key,
        label: field.label,
        type: field.type,
        required: field.required,
        order: field.order,
        options: field.options ?? null,
        placeholder: field.placeholder ?? null,
        helpText: field.helpText ?? null,
        canonical: field.canonical,
        canonicalKey: field.canonical ? field.canonicalKey! : null,
      })
    }

    return resolved
  }

  private validateFieldOptions(field: MedicalRecordTemplateFieldDto): void {
    const requiresOptions =
      field.type === MedicalRecordFieldType.SELECT ||
      field.type === MedicalRecordFieldType.MULTISELECT

    if (requiresOptions) {
      if (!field.options || field.options.length === 0) {
        throw new UnprocessableEntityException(
          `Options are required for field "${field.label}"`,
        )
      }
      const values = field.options.map((option) => option.value)
      if (new Set(values).size !== values.length) {
        throw new UnprocessableEntityException(
          `Option values must be unique for field "${field.label}"`,
        )
      }
    } else if (field.options && field.options.length > 0) {
      throw new UnprocessableEntityException(
        `Options are not allowed for field "${field.label}"`,
      )
    }
  }

  private async validateCanonical(field: MedicalRecordTemplateFieldDto): Promise<void> {
    if (!field.canonical) return

    if (!field.canonicalKey) {
      throw new UnprocessableEntityException(
        `canonicalKey is required for canonical field "${field.label}"`,
      )
    }

    const canonical = await this.canonicalFieldsRepository.findByCanonicalKey(field.canonicalKey)
    if (!canonical) {
      throw new UnprocessableEntityException(`Canonical field "${field.canonicalKey}" not found`)
    }
    if (canonical.type !== field.type) {
      throw new UnprocessableEntityException(
        `Field "${field.label}" type does not match canonical field type`,
      )
    }
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
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    }
  }
}
