import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import {
  CouncilType,
  CreateMedicalRecordTemplateDto,
  MedicalRecordFieldType,
  MedicalRecordTemplateSectionDto,
  MedicalRecordTemplateFieldDto,
  MedicalRecordTemplateResponseDto,
  UserRole,
} from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IClinicSpecialtiesRepository } from '../../clinic-specialties/repositories/clinic-specialties.repository.interface'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IMedicalRecordCanonicalFieldsRepository } from '../../medical-record-canonical-fields/repositories/medical-record-canonical-fields.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { getPrimaryCouncilType } from '../../professionals/utils/get-primary-council-type.util'
import {
  MedicalRecordTemplate,
  MedicalRecordTemplateField,
  MedicalRecordTemplateSection,
} from '../entities/medical-record-template.entity'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'
import { generateFieldKey } from '../utils/generate-field-key.util'

interface ResolvedScope {
  specialtyId: string | null
  councilType: CouncilType | null
}

@Injectable()
export class CreateMedicalRecordTemplateUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateMedicalRecordTemplateUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly templatesRepository: IMedicalRecordTemplatesRepository,
    private readonly clinicSpecialtiesRepository: IClinicSpecialtiesRepository,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly canonicalFieldsRepository: IMedicalRecordCanonicalFieldsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    dto: CreateMedicalRecordTemplateDto,
    currentUser: ICurrentUser,
  ): Promise<MedicalRecordTemplateResponseDto> {
    const clinicId = currentUser.clinicId!
    const { specialtyId, councilType } = await this.resolveScope(dto, currentUser, clinicId)

    // Generalist template (no specialty) has no clinic-specialty link to validate.
    if (specialtyId) {
      const link = await this.clinicSpecialtiesRepository.findByClinicAndSpecialty(
        clinicId,
        specialtyId,
      )
      if (!link) throw new UnprocessableEntityException('Specialty is not linked to this clinic')
    }

    const existing = await this.templatesRepository.findByClinicAndSpecialty(
      clinicId,
      specialtyId,
      councilType,
    )
    if (existing) {
      throw new ConflictException(
        specialtyId
          ? 'A template already exists for this specialty'
          : 'A template already exists for this profession',
      )
    }

    const sections = this.resolveSections(dto.sections ?? [])
    const validSectionKeys = new Set(sections.map((s) => s.key))
    const fields = await this.resolveFields(dto.fields, validSectionKeys)

    const created = await this.templatesRepository.create(
      { specialtyId, councilType, name: dto.name, fields, sections },
      clinicId,
    )

    try {
      await this.cacheService.delByPattern(`medical_record_templates:list:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', {
        context: CreateMedicalRecordTemplateUseCase.name,
      })
    }

    const specialty = specialtyId
      ? await this.specialtiesRepository.findById(specialtyId)
      : null
    return this.toResponse(created, specialty?.name ?? null)
  }

  // ADMIN keeps full flexibility: any specialty in the clinic's catalog, or an explicit
  // councilType for a profession-wide template (defaults to CRM, preserving the pre-existing
  // "generalist doctor" behavior when neither specialtyId nor councilType is sent).
  //
  // PROFESSIONAL is scoped to their own profession: CRM professionals may only pick one of
  // their own specialties (or none, for the clinic's shared CRM-generalist template); every
  // other council type is barred from specialties entirely and always targets their own
  // profession-wide template.
  private async resolveScope(
    dto: CreateMedicalRecordTemplateDto,
    currentUser: ICurrentUser,
    clinicId: string,
  ): Promise<ResolvedScope> {
    const specialtyId = dto.specialtyId ?? null

    if (currentUser.role !== UserRole.PROFESSIONAL) {
      return { specialtyId, councilType: specialtyId ? null : (dto.councilType ?? CouncilType.CRM) }
    }

    const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
    if (!professional) throw new NotFoundException('Professional not found')

    const primaryCouncilType = getPrimaryCouncilType(professional)

    if (primaryCouncilType !== CouncilType.CRM) {
      if (specialtyId) {
        throw new UnprocessableEntityException('Specialties are not applicable to this profession')
      }
      return { specialtyId: null, councilType: primaryCouncilType }
    }

    if (!specialtyId) return { specialtyId: null, councilType: CouncilType.CRM }

    const ownsSpecialty = professional.professionalSpecialties.some(
      (professionalSpecialty) => professionalSpecialty.specialtyId === specialtyId,
    )
    if (!ownsSpecialty) {
      throw new ForbiddenException('You can only create a template for your own specialty')
    }
    return { specialtyId, councilType: null }
  }

  private resolveSections(
    inputSections: MedicalRecordTemplateSectionDto[],
  ): MedicalRecordTemplateSection[] {
    const usedKeys = new Set<string>()
    return inputSections.map((section) => {
      // Use the client-provided key when present (allows frontend to link fields to sections).
      // Fall back to generation only when key is absent or already taken (duplicate guard).
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
    validSectionKeys: Set<string>,
  ): Promise<MedicalRecordTemplateField[]> {
    const usedKeys = new Set<string>()
    const resolved: MedicalRecordTemplateField[] = []

    for (const field of inputFields) {
      this.validateFieldOptions(field)
      await this.validateCanonical(field)
      this.validateSectionKey(field, validSectionKeys)

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
