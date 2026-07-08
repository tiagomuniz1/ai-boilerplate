import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import {
  MedicalRecordFieldType,
  MedicalRecordTemplateSectionDto,
  MedicalRecordTemplateFieldDto,
  MedicalRecordTemplateResponseDto,
  UpdateMedicalRecordTemplateDto,
} from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IMedicalRecordCanonicalFieldsRepository } from '../../medical-record-canonical-fields/repositories/medical-record-canonical-fields.repository.interface'
import {
  MedicalRecordTemplate,
  MedicalRecordTemplateField,
  MedicalRecordTemplateSection,
} from '../entities/medical-record-template.entity'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'
import { generateFieldKey } from '../utils/generate-field-key.util'

@Injectable()
export class UpdateMedicalRecordTemplateUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateMedicalRecordTemplateUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly templatesRepository: IMedicalRecordTemplatesRepository,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly canonicalFieldsRepository: IMedicalRecordCanonicalFieldsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    id: string,
    dto: UpdateMedicalRecordTemplateDto,
    currentUser: ICurrentUser,
  ): Promise<MedicalRecordTemplateResponseDto> {
    const clinicId = currentUser.clinicId!

    const template = await this.templatesRepository.findById(id, clinicId)
    if (!template) throw new NotFoundException('Template not found')

    const updateData: Partial<MedicalRecordTemplate> = {}
    if (dto.name !== undefined) updateData.name = dto.name
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive
    if (dto.sections !== undefined) {
      updateData.sections = this.resolveSections(dto.sections)
    }
    if (dto.fields !== undefined) {
      const validSectionKeys = new Set(
        (updateData.sections ?? template.sections).map((s) => s.key),
      )
      updateData.fields = await this.resolveFields(dto.fields, template.fields, validSectionKeys)
    }

    let updated: MedicalRecordTemplate
    try {
      updated = await this.templatesRepository.update(id, updateData, clinicId)
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      throw error
    }

    try {
      await this.cacheService.del(`medical_record_template:${clinicId}:${id}`)
      await this.cacheService.delByPattern(`medical_record_templates:list:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', {
        context: UpdateMedicalRecordTemplateUseCase.name,
      })
    }

    const specialty = updated.specialtyId
      ? await this.specialtiesRepository.findById(updated.specialtyId)
      : null
    return this.toResponse(updated, specialty?.name ?? null)
  }

  private resolveSections(
    inputSections: MedicalRecordTemplateSectionDto[],
  ): MedicalRecordTemplateSection[] {
    const usedKeys = new Set<string>()
    return inputSections.map((section) => {
      // Use any provided key (existing or client-generated) as long as it is unique.
      if (section.key && !usedKeys.has(section.key)) {
        usedKeys.add(section.key)
        return { key: section.key, title: section.title, order: section.order }
      }
      const key = generateFieldKey(section.title, usedKeys)
      return { key, title: section.title, order: section.order }
    })
  }

  private async resolveFields(
    inputFields: MedicalRecordTemplateFieldDto[],
    existingFields: MedicalRecordTemplateField[],
    validSectionKeys: Set<string>,
  ): Promise<MedicalRecordTemplateField[]> {
    const usedKeys = new Set<string>()
    const existingKeys = new Set(existingFields.map((field) => field.key))
    const resolved: MedicalRecordTemplateField[] = []

    for (const field of inputFields) {
      this.validateFieldOptions(field)
      await this.validateCanonical(field)
      this.validateSectionKey(field, validSectionKeys)

      let key: string
      if (field.key && existingKeys.has(field.key) && !usedKeys.has(field.key)) {
        key = field.key
        usedKeys.add(key)
      } else {
        key = generateFieldKey(field.label, usedKeys)
      }

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
        sectionKey: field.sectionKey ?? null,
      })
    }

    return resolved
  }

  private validateSectionKey(
    field: MedicalRecordTemplateFieldDto,
    validSectionKeys: Set<string>,
  ): void {
    if (field.sectionKey && !validSectionKeys.has(field.sectionKey)) {
      throw new UnprocessableEntityException(
        `Field "${field.label}" references unknown section key "${field.sectionKey}"`,
      )
    }
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
    specialtyName: string | null,
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
